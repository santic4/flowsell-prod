import { config, LEGAL_VERSION, PLANS, SUPPORT_PHONE } from './config.js';
import { createSalesCsv, validateDateRange } from '../services/statisticsServices.js';

const MOCK_ACCOUNT_ID = '65f0a0000000000000000001';
const MOCK_JOB_ID = '550e8400-e29b-41d4-a716-446655440000';
const DAY_MS = 86400000;

const svgThumbnail = (label, accent = '#3483fa') => {
  const safe = String(label || 'FS').slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="26" fill="#f6f8fb"/><circle cx="120" cy="120" r="66" fill="${accent}" opacity="0.14"/><rect x="68" y="78" width="104" height="84" rx="16" fill="white" stroke="${accent}" stroke-width="5"/><text x="120" y="132" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="${accent}">${safe || 'FS'}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const PRODUCT_SEED = [
  ['Auriculares Bluetooth Inalámbricos Pro', 38990, 428, 12, 'AU'],
  ['Soporte Notebook Aluminio Regulable', 31990, 316, 0, 'SN'],
  ['Mouse Inalámbrico Ergonómico USB-C', 22990, 511, 0, 'MI'],
  ['Teclado Mecánico Compacto RGB', 64990, 247, 6, 'TM'],
  ['Lámpara LED Escritorio con USB', 27990, 392, 0, 'LE'],
  ['Cargador Rápido 30W USB-C', 24990, 603, 0, 'CR'],
  ['Hub USB-C 7 en 1 HDMI', 56990, 204, 0, 'HU'],
  ['Webcam Full HD con Micrófono', 44990, 289, 0, 'WF'],
  ['Parlante Bluetooth Portátil', 35990, 466, 5, 'PB'],
  ['Power Bank 20.000 mAh Carga Rápida', 52990, 351, 0, 'PB'],
  ['Cable USB-C Reforzado 2 Metros', 12990, 788, 4, 'CU'],
  ['Base Refrigerante para Notebook', 41990, 173, 0, 'BR'],
  ['Organizador de Cables para Escritorio', 14990, 642, 3, 'OC'],
  ['Mini Trípode Flexible para Celular', 18990, 334, 0, 'MT'],
  ['Aro de Luz LED 26 cm con Trípode', 34990, 271, 0, 'AL'],
  ['Funda Notebook 15.6 Impermeable', 25990, 455, 4, 'FN'],
  ['Adaptador HDMI a USB-C 4K', 29990, 298, 0, 'AH'],
  ['Micrófono USB Condensador Streaming', 78990, 126, 0, 'MU'],
  ['Control Remoto Bluetooth para Celular', 15990, 542, 0, 'CB'],
  ['Stand Vertical para Notebook', 36990, 188, 0, 'SV'],
  ['Kit Limpieza Electrónica 8 en 1', 19990, 479, 0, 'KL'],
  ['Alfombrilla XL para Escritorio', 28990, 361, 3, 'AX'],
  ['Adaptador Bluetooth 5.3 USB', 17990, 624, 0, 'AB'],
  ['Cable HDMI 2.1 2 Metros', 21990, 517, 0, 'CH'],
  ['Soporte Celular para Escritorio', 16990, 693, 5, 'SC'],
  ['Cargador Inalámbrico 15W', 26990, 338, 0, 'CI'],
  ['Mochila Urbana para Notebook 15.6', 58990, 219, 4, 'MN'],
  ['Lector de Tarjetas USB-C SD MicroSD', 23990, 307, 0, 'LT'],
  ['Extensión USB 3.0 1.5 Metros', 13990, 401, 0, 'EU'],
  ['Protector de Tensión 6 Tomas USB', 46990, 255, 0, 'PT'],
  ['Apoya Muñeca Ergonómico Teclado', 18990, 284, 0, 'AM'],
  ['Soporte Doble Monitor de Escritorio', 94990, 97, 0, 'SD'],
  ['Balanza Digital Cocina 10 kg', 24990, 372, 0, 'BD'],
  ['Termómetro Digital Infrarrojo Cocina', 32990, 164, 0, 'TD'],
  ['Botella Térmica Acero 750 ml', 29990, 436, 6, 'BT'],
  ['Set Organizadores de Viaje x6', 27990, 348, 4, 'SO'],
];

const ACCENTS = ['#3483fa', '#7c3aed', '#0f766e', '#d97706', '#2563eb', '#475569'];

export const mockProducts = PRODUCT_SEED.map(([title, price, sold, variationCount, initials], index) => {
  const id = `MLA14500${String(index + 1).padStart(5, '0')}`;
  const variations = variationCount
    ? Array.from({ length: Math.min(variationCount, 4) }, (_, variantIndex) => ({
        id: String(7300000000 + index * 10 + variantIndex),
        attribute_combinations: [
          { name: index % 2 ? 'Color' : 'Modelo', value_name: ['Negro', 'Blanco', 'Gris', 'Azul'][variantIndex % 4] },
        ],
        available_quantity: 8 + ((index + variantIndex) % 17),
        price: price + variantIndex * 2500,
      }))
    : [];
  return {
    id,
    title,
    thumbnail: svgThumbnail(initials, ACCENTS[index % ACCENTS.length]),
    status: index === 9 || index === 27 ? 'paused' : 'active',
    available_quantity: 14 + ((index * 7) % 48),
    sold_quantity: sold,
    price,
    currency_id: 'ARS',
    permalink: `https://articulo.mercadolibre.com.ar/${id}`,
    variations,
  };
});

const TEMPLATE_SEED = [
  ['Gracias por tu compra', '¡Hola! Gracias por elegirnos. Ya recibimos tu compra y estamos preparando todo para que avance correctamente.'],
  ['Confirmación de pedido', 'Tu pedido quedó confirmado. Si necesitás aclarar algún detalle de la compra, podés responder este mensaje.'],
  ['Información de despacho', 'Estamos preparando el despacho. Vas a poder seguir las novedades desde el detalle de tu compra en Mercado Libre.'],
  ['Seguimiento posventa', '¿Cómo estás? Queríamos confirmar que todo haya llegado bien. Si necesitás ayuda con el producto, escribinos por acá.'],
  ['Guía de uso', 'Gracias por tu compra. Te compartimos una recomendación rápida para que puedas empezar a usar el producto sin complicaciones.'],
  ['Recordatorio de instalación', 'Antes de usar el producto, revisá las indicaciones de instalación. Si algo no coincide, consultanos y te ayudamos.'],
  ['Atención ante inconvenientes', 'Si tuviste algún inconveniente, contanos qué pasó antes de iniciar otro trámite. Vamos a intentar ayudarte lo antes posible.'],
  ['Mensaje para compra con variante', 'Recibimos tu compra y verificamos la variante seleccionada. Si necesitás confirmar color o modelo, respondé este mensaje.'],
  ['Cierre de posventa', 'Gracias nuevamente por tu compra. Esperamos que el producto haya cumplido tus expectativas. Quedamos disponibles ante cualquier consulta.'],
];

export const mockTemplates = TEMPLATE_SEED.map(([name, content], index) => ({
  _id: `64f1000000000000000000${String(index + 1).padStart(2, '0')}`,
  name,
  content,
  assignedPublications: mockProducts.slice(index, index + 6 + (index % 4)).map((product) => product.title),
  attachments: [],
  legacyAttachments: 0,
  createdAt: new Date(Date.UTC(2026, 5, 3 + index)).toISOString(),
  updatedAt: new Date(Date.UTC(2026, 7, 12 + index)).toISOString(),
}));

const templateRef = (index) => ({ templateId: mockTemplates[index]._id, name: mockTemplates[index].name });

export const mockSavedProducts = mockProducts.slice(0, 18).map((product, index) => {
  const hasVariations = product.variations.length > 0 && index % 3 === 0;
  const primaryTemplates = [templateRef(index % 4), templateRef((index + 3) % 7)];
  return {
    _id: `66a2000000000000000000${String(index + 1).padStart(2, '0')}`,
    id: product.id,
    title: product.title,
    site_id: 'MLA',
    templates: hasVariations ? [] : primaryTemplates,
    variations: hasVariations
      ? product.variations.slice(0, 3).map((variation, variationIndex) => ({
          id: String(variation.id),
          name: variation.attribute_combinations.map((attribute) => attribute.value_name).join(' / '),
          templates: [templateRef((index + variationIndex) % 5), templateRef((index + variationIndex + 4) % 8)],
        }))
      : [],
    secondMessages: index % 3 === 0 ? [templateRef(3)] : index % 5 === 0 ? [templateRef(8)] : [],
    secondMessageDelay: [12, 18, 24, 36][index % 4],
    enabled: index !== 7 && index !== 15,
    markDelivered: index === 4 || index === 11,
    effectiveActive: index !== 7 && index !== 15,
    createdAt: new Date(Date.UTC(2026, 4, 10 + index)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 7, 15 + (index % 12))).toISOString(),
  };
});

const utcDate = (value) => new Date(`${value}T00:00:00.000Z`);
const dateKey = (date) => date.toISOString().slice(0, 10);
const dayOrdinal = (date) => Math.floor(date.getTime() / DAY_MS);

const dailyOrders = (date) => {
  const ordinal = dayOrdinal(date);
  const variation = ((ordinal * 17) % 9) - 4;
  const weekday = date.getUTCDay();
  const weekendAdjustment = weekday === 6 ? -5 : weekday === 0 ? -8 : 0;
  return 58 + variation + weekendAdjustment;
};

const averageTicketFor = (date) => {
  const ordinal = dayOrdinal(date);
  return 28500 + ((ordinal * 7919) % 8500);
};

const unitsFor = (orders, date) => orders + Math.round(orders * (0.14 + ((dayOrdinal(date) % 5) * 0.015)));

const productForOrdinal = (ordinal) => mockProducts[Math.abs(ordinal) % 12];

export function createMockSalesReport(from, to) {
  const range = validateDateRange(from, to);
  const timeline = [];
  let totalRevenue = 0;
  let orders = 0;
  let units = 0;

  const cursor = utcDate(range.from);
  const last = utcDate(range.to);
  while (cursor <= last) {
    const dayOrders = dailyOrders(cursor);
    const averageTicket = averageTicketFor(cursor);
    const dayRevenue = Math.round(dayOrders * averageTicket);
    const dayUnits = unitsFor(dayOrders, cursor);
    timeline.push({ date: dateKey(cursor), revenue: dayRevenue, orders: dayOrders, units: dayUnits });
    totalRevenue += dayRevenue;
    orders += dayOrders;
    units += dayUnits;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const weights = [0.14, 0.115, 0.092, 0.078, 0.067, 0.059, 0.051, 0.045];
  const topProducts = weights.map((weight, index) => {
    const product = mockProducts[index];
    const revenue = Math.round(totalRevenue * weight);
    const quantity = Math.max(1, Math.round(revenue / product.price));
    return {
      itemId: product.id,
      title: product.title,
      quantity,
      orders: Math.max(1, Math.round(quantity * 0.92)),
      revenue,
    };
  });

  const recentOrders = [];
  let recentDate = utcDate(range.to);
  for (let index = 0; index < 16; index += 1) {
    if (recentDate < utcDate(range.from)) break;
    const ordinal = dayOrdinal(recentDate) - index;
    const product = productForOrdinal(ordinal);
    const quantity = index % 6 === 0 ? 2 : 1;
    const total = product.price * quantity;
    recentOrders.push({
      orderId: String(200000000000 + Math.abs(ordinal * 97) + index),
      date: new Date(recentDate.getTime() + (18 - (index % 9)) * 3600000).toISOString(),
      buyerId: String(90000000 + Math.abs(ordinal * 13) + index),
      buyerNickname: ['comprador_norte', 'lucas.store', 'mari_g', 'tomas.ar', 'vale_online', 'nico_ventas'][index % 6],
      itemsCount: quantity,
      items: [{ itemId: product.id, title: product.title, quantity }],
      total,
      currencyId: 'ARS',
      status: 'paid',
    });
    if (index % 3 === 2) recentDate = new Date(recentDate.getTime() - DAY_MS);
  }

  const bestDay = timeline.reduce((best, day) => (!best || day.revenue > best.revenue ? day : best), null);
  return {
    summary: {
      totalRevenue,
      orders,
      units,
      averageTicket: orders ? Math.round(totalRevenue / orders) : 0,
      uniqueBuyers: Math.round(orders * 0.89),
      bestDay,
    },
    timeline,
    topProducts,
    recentOrders,
    meta: {
      ...range,
      currencyId: 'ARS',
      generatedAt: new Date().toISOString(),
      source: 'Mercado Libre',
    },
  };
}

const createMockOrders = (from, to) => {
  const range = validateDateRange(from, to);
  const orders = [];
  const cursor = utcDate(range.from);
  let serial = 0;
  while (cursor <= utcDate(range.to)) {
    const count = dailyOrders(cursor);
    for (let index = 0; index < count; index += 1) {
      const product = mockProducts[(dayOrdinal(cursor) + index * 3) % 12];
      const quantity = index % 8 === 0 ? 2 : 1;
      const unitPrice = product.price;
      orders.push({
        id: String(200000000000 + dayOrdinal(cursor) * 100 + index),
        date_created: new Date(cursor.getTime() + (8 + (index % 13)) * 3600000 + (index % 4) * 900000).toISOString(),
        status: 'paid',
        currency_id: 'ARS',
        buyer: { id: String(90000000 + serial), nickname: `comprador_${String((serial % 900) + 100)}` },
        total_amount: unitPrice * quantity,
        order_items: [{ item: { id: product.id, title: product.title }, quantity, unit_price: unitPrice, currency_id: 'ARS' }],
      });
      serial += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return orders;
};

export const createMockSalesCsv = (from, to) => createSalesCsv(createMockOrders(from, to));

export const mockActivity = Array.from({ length: 50 }, (_, index) => {
  const createdAt = new Date(Date.now() - index * 3.2 * 3600000);
  const status = index === 17 ? 'uncertain' : index === 31 ? 'failed' : 'sent';
  return {
    _id: `67b3000000000000000000${String(index + 1).padStart(2, '0')}`,
    orderId: String(200000000000 + 87000 - index * 13),
    phase: index % 9 === 0 ? 'campaign' : index % 4 === 0 ? 'delayed' : 'initial',
    status,
    reason: status === 'failed' ? 'PROVIDER_REJECTED' : '',
    createdAt: createdAt.toISOString(),
  };
});

const mockBuyers = Array.from({ length: 186 }, (_, index) => ({
  buyerId: String(88000000 + index * 7),
  nickname: ['martina_ok', 'facu1988', 'agus.shop', 'leo_online', 'carla.r', 'fede_store', 'sofi.ar'][index % 7] + (index > 6 ? String(index + 1) : ''),
  order_id: String(200000800000 + index * 11),
}));

export const mockCampaignJob = {
  jobId: MOCK_JOB_ID,
  status: 'COMPLETED',
  buyers: mockBuyers,
  statusMessagesMassive: 'COMPLETED',
  progress: { offset: 186, totalEstimate: 186, processedSoFar: 186, lastBatchId: 'mock-final', percent: 100, updatedAt: new Date().toISOString() },
  createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  completedAt: new Date(Date.now() - 18 * 60000).toISOString(),
  itemIds: mockProducts.slice(0, 6).map((product) => product.id),
  sent: 186,
  failed: 0,
};

export function mockAccountPayload() {
  return {
    id: MOCK_ACCOUNT_ID,
    meliId: '123456789',
    nickname: 'Tienda Norte',
    email: 'ventas@tiendanorte.demo',
    picture: null,
    status: 'active',
    plan: { ...PLANS.premium },
    planExpiresAt: null,
    isAdmin: false,
    consentCurrent: true,
    legalVersion: LEGAL_VERSION,
    legalReady: true,
    usage: {
      templates: mockTemplates.length,
      flows: mockSavedProducts.length,
      storageBytes: 74 * 1024 * 1024,
      messages: 1084,
      campaigns: 2,
      month: new Date().toISOString().slice(0, 7),
    },
  };
}

const mockProductDetail = (id) => {
  const saved = mockSavedProducts.find((product) => product.id === id);
  if (saved) return saved;
  const product = mockProducts.find((item) => item.id === id);
  return product ? { id: product.id, title: product.title, site_id: 'MLA', templates: [], variations: [], secondMessages: [], secondMessageDelay: 24, enabled: true, markDelivered: false } : null;
};

export function mockOperationsMiddleware(req, res, next) {
  if (!config.mock) return next();
  const path = req.path;
  const method = req.method.toUpperCase();

  if (method === 'GET' && path === '/templates') return res.json(mockTemplates);
  if (method === 'POST' && path === '/templates') return res.status(201).json(mockTemplates[0]);
  if (method === 'PUT' && /^\/templates\/[a-f0-9]{24}$/i.test(path)) return res.json(mockTemplates[0]);
  if (method === 'DELETE' && /^\/templates\/[a-f0-9]{24}$/i.test(path)) return res.status(204).end();
  if (method === 'GET' && /^\/media\/[a-f0-9]{24}$/i.test(path)) {
    const svg = decodeURIComponent(svgThumbnail('FS').split(',')[1]);
    return res.type('image/svg+xml').send(svg);
  }

  if (method === 'GET' && path === '/products') {
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const items = mockProducts.slice(offset, offset + 50);
    return res.json({ items, total: mockProducts.length, nextOffset: offset + 50 < mockProducts.length ? offset + 50 : null });
  }
  if (method === 'GET' && path === '/products/saved') return res.json(mockSavedProducts);

  const templateMatch = path.match(/^\/products\/template\/(MLA\d+)$/i);
  if (method === 'GET' && templateMatch) {
    const product = mockProductDetail(templateMatch[1]);
    return product ? res.json(product) : res.status(404).json({ error: 'Flujo no encontrado.' });
  }

  const refetchMatch = path.match(/^\/products\/(MLA\d+)\/refetch-id$/i);
  if (method === 'GET' && refetchMatch) {
    const product = mockProducts.find((item) => item.id === refetchMatch[1]);
    return product ? res.json(product) : res.status(404).json({ error: 'Publicación no encontrada.' });
  }

  const productMutationMatch = path.match(/^\/products\/(MLA\d+)\/(assign-templates-modal|assign-delay)$/i);
  if (method === 'POST' && productMutationMatch) return res.json(mockProductDetail(productMutationMatch[1]) || { ok: true });
  if (method === 'PATCH' && /^\/products\/(MLA\d+)\/settings$/i.test(path)) return res.json(mockProductDetail(path.split('/')[2]) || { ok: true });
  if (method === 'POST' && /^\/templates\/[a-f0-9]{24}\/assign-second-messages$/i.test(path)) return res.json({ ok: true });
  if (method === 'POST' && path === '/products/assign-template-to-all') return res.json({ ok: true });
  if (method === 'PATCH' && /^\/products\/(MLA\d+)\/templates\/reorder$/i.test(path)) return res.json({ templates: mockProductDetail(path.split('/')[2])?.templates || [] });
  if (method === 'DELETE' && /^\/products\/(MLA\d+)\/(templates|second-template)\/[a-f0-9]{24}$/i.test(path)) return res.status(204).end();
  if (method === 'DELETE' && /^\/products\/(MLA\d+)\/saved-product$/i.test(path)) return res.status(204).end();

  if (method === 'GET' && path === '/statistics/sales') return res.json(createMockSalesReport(req.query.from, req.query.to));
  if (method === 'GET' && path === '/statistics/sales/export') {
    return res.attachment('flowsell-ventas-demo.csv').type('text/csv').send(createMockSalesCsv(req.query.from, req.query.to));
  }

  if (method === 'POST' && path === '/client-tracking') return res.status(202).json({ jobId: MOCK_JOB_ID });
  if (method === 'GET' && /^\/client-tracking\/buyers\/[0-9a-f-]{36}$/i.test(path)) return res.json({ ...mockCampaignJob, progress: { ...mockCampaignJob.progress, updatedAt: new Date().toISOString() } });
  if (method === 'POST' && path === '/client-tracking/send') return res.status(202).json({ jobId: MOCK_JOB_ID, status: 'PROCESSING' });
  if (method === 'GET' && path === '/activity') return res.json(mockActivity);

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return res.status(409).json({ error: 'Esta acción está deshabilitada mientras MOCK=true para proteger los datos reales.', code: 'MOCK_READ_ONLY' });
  }
  return next();
}

export function mockAccountMiddleware(req, res, next) {
  if (!config.mock) return next();
  const method = req.method.toUpperCase();
  const path = req.path;
  if (method === 'GET' && path === '/') return next();
  if (method === 'POST' && path === '/consent') return res.json({ ok: true });
  if (method === 'POST' && path === '/plan-request') {
    const requestId = 'demo-plan-2026-001';
    const text = `Hola, quiero consultar un plan de Flow Sell. Mi solicitud demo es ${requestId}.`;
    return res.json({ requestId, whatsappUrl: `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}` });
  }
  if (method === 'GET' && path === '/export') {
    return res.attachment('flowsell-datos-demo.json').json({
      generatedAt: new Date().toISOString(),
      account: mockAccountPayload(),
      templates: mockTemplates,
      products: mockSavedProducts,
      deliveries: mockActivity,
      note: 'Datos demostrativos generados con MOCK=true.',
    });
  }
  if (method === 'POST' && path === '/sessions/revoke') return res.status(409).json({ error: 'Acción deshabilitada mientras MOCK=true para proteger la sesión real.', code: 'MOCK_READ_ONLY' });
  if (method === 'POST' && path === '/disconnect') return res.status(409).json({ error: 'Acción deshabilitada mientras MOCK=true para proteger la conexión real.', code: 'MOCK_READ_ONLY' });
  if (method === 'DELETE' && path === '/') return res.status(409).json({ error: 'La eliminación de cuenta está deshabilitada mientras MOCK=true.', code: 'MOCK_READ_ONLY' });
  return next();
}
