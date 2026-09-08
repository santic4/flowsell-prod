const MAX_RANGE_DAYS = 366;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const inputDate = (date) => date.toISOString().slice(0, 10);

export const validateDateRange = (from, to, now = new Date()) => {
  const fallbackTo = inputDate(now);
  const fallbackFromDate = new Date(`${fallbackTo}T00:00:00.000Z`);
  fallbackFromDate.setUTCDate(fallbackFromDate.getUTCDate() - 29);
  const normalizedFrom = from || inputDate(fallbackFromDate);
  const normalizedTo = to || fallbackTo;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(normalizedFrom) || !datePattern.test(normalizedTo)) {
    throw createHttpError(400, 'Las fechas deben tener el formato AAAA-MM-DD.');
  }

  const fromDate = new Date(`${normalizedFrom}T00:00:00.000Z`);
  const toDate = new Date(`${normalizedTo}T23:59:59.999Z`);

  if (
    Number.isNaN(fromDate.getTime())
    || Number.isNaN(toDate.getTime())
    || inputDate(fromDate) !== normalizedFrom
    || inputDate(toDate) !== normalizedTo
  ) {
    throw createHttpError(400, 'El rango de fechas no es válido.');
  }
  if (fromDate > toDate) {
    throw createHttpError(400, 'La fecha inicial no puede ser posterior a la fecha final.');
  }

  const rangeDays = Math.floor((toDate - fromDate) / 86400000) + 1;
  if (rangeDays > MAX_RANGE_DAYS) {
    throw createHttpError(400, `El período máximo permitido es de ${MAX_RANGE_DAYS} días.`);
  }

  return {
    from: normalizedFrom,
    to: normalizedTo,
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
    rangeDays,
  };
};

const orderTotal = (order) => {
  const explicitTotal = Number(order.total_amount);
  if (order.total_amount != null && Number.isFinite(explicitTotal)) return explicitTotal;
  return (order.order_items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
};

export const aggregateSales = (orders = [], range) => {
  const uniqueOrders = Array.from(new Map(orders.map((order) => [String(order.id), order])).values())
    .filter((order) => !order.status || order.status === 'paid');
  const buyers = new Set();
  const products = new Map();
  const timelineMap = new Map();
  let totalRevenue = 0;
  let units = 0;
  let currencyId = 'ARS';

  const cursor = new Date(`${range.from}T00:00:00.000Z`);
  const lastDate = new Date(`${range.to}T00:00:00.000Z`);
  while (cursor <= lastDate) {
    timelineMap.set(inputDate(cursor), { date: inputDate(cursor), revenue: 0, orders: 0, units: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  uniqueOrders.forEach((order) => {
    const total = orderTotal(order);
    const orderDate = dateKey(order.date_created || order.date_closed || new Date());
    const day = timelineMap.get(orderDate);
    totalRevenue += total;
    currencyId = order.currency_id || order.order_items?.[0]?.currency_id || currencyId;
    if (order.buyer?.id != null) buyers.add(String(order.buyer.id));

    let orderUnits = 0;
    (order.order_items || []).forEach((orderItem) => {
      const quantity = Number(orderItem.quantity) || 0;
      const unitPrice = Number(orderItem.unit_price) || 0;
      const itemId = String(orderItem.item?.id || orderItem.item_id || 'sin-id');
      const current = products.get(itemId) || {
        itemId,
        title: orderItem.item?.title || orderItem.title || 'Producto sin título',
        quantity: 0,
        revenue: 0,
        orderIds: new Set(),
      };
      current.quantity += quantity;
      current.revenue += quantity * unitPrice;
      current.orderIds.add(String(order.id));
      products.set(itemId, current);
      units += quantity;
      orderUnits += quantity;
    });

    if (day) {
      day.revenue += total;
      day.orders += 1;
      day.units += orderUnits;
    }
  });

  const timeline = Array.from(timelineMap.values()).map((day) => ({ ...day, revenue: roundMoney(day.revenue) }));
  const topProducts = Array.from(products.values())
    .map((product) => ({
      itemId: product.itemId,
      title: product.title,
      quantity: product.quantity,
      orders: product.orderIds.size,
      revenue: roundMoney(product.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, 20);

  const recentOrders = [...uniqueOrders]
    .sort((a, b) => new Date(b.date_created || 0) - new Date(a.date_created || 0))
    .slice(0, 20)
    .map((order) => ({
      orderId: String(order.id),
      date: order.date_created,
      buyerId: order.buyer?.id != null ? String(order.buyer.id) : null,
      buyerNickname: order.buyer?.nickname || null,
      itemsCount: (order.order_items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      items: (order.order_items || []).map((item) => ({
        itemId: String(item.item?.id || item.item_id || ''),
        title: item.item?.title || item.title || 'Producto sin título',
        quantity: Number(item.quantity) || 0,
      })),
      total: roundMoney(orderTotal(order)),
      currencyId: order.currency_id || order.order_items?.[0]?.currency_id || currencyId,
      status: order.status || 'paid',
    }));

  const bestDay = timeline.reduce((best, day) => day.revenue > (best?.revenue || 0) ? day : best, null);

  return {
    summary: {
      totalRevenue: roundMoney(totalRevenue),
      orders: uniqueOrders.length,
      units,
      averageTicket: uniqueOrders.length ? roundMoney(totalRevenue / uniqueOrders.length) : 0,
      uniqueBuyers: buyers.size,
      bestDay,
    },
    timeline,
    topProducts,
    recentOrders,
    currencyId,
  };
};

const csvCell = (value) => {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  const safeText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  const normalized = safeText.replace(/"/g, '""');
  return `"${normalized}"`;
};

export const createSalesCsv = (orders = []) => {
  const header = ['Fecha', 'Orden', 'Comprador ID', 'Comprador', 'Producto ID', 'Producto', 'Cantidad', 'Precio unitario', 'Subtotal', 'Moneda', 'Estado'];
  const rows = [];

  orders.forEach((order) => {
    const items = order.order_items?.length ? order.order_items : [{}];
    items.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      rows.push([
        order.date_created || '',
        order.id || '',
        order.buyer?.id || '',
        order.buyer?.nickname || '',
        item.item?.id || item.item_id || '',
        item.item?.title || item.title || '',
        quantity,
        unitPrice.toFixed(2).replace('.', ','),
        (quantity * unitPrice).toFixed(2).replace('.', ','),
        order.currency_id || item.currency_id || 'ARS',
        order.status || 'paid',
      ]);
    });
  });

  return `\uFEFFsep=;\r\n${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
};
