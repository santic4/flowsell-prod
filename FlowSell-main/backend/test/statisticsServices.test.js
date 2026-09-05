import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSales, createSalesCsv, validateDateRange } from '../src/services/statisticsServices.js';

const range = { from: '2026-09-01', to: '2026-09-03' };
const orders = [
  {
    id: 101,
    status: 'paid',
    date_created: '2026-09-01T14:00:00.000Z',
    total_amount: 2000,
    currency_id: 'ARS',
    buyer: { id: 1, nickname: 'COMPRADOR_1' },
    order_items: [{ item: { id: 'MLA1', title: 'Producto A' }, quantity: 2, unit_price: 1000 }],
  },
  {
    id: 102,
    status: 'paid',
    date_created: '2026-09-03T15:00:00.000Z',
    total_amount: 1500,
    currency_id: 'ARS',
    buyer: { id: 1, nickname: 'COMPRADOR_1' },
    order_items: [
      { item: { id: 'MLA1', title: 'Producto A' }, quantity: 1, unit_price: 1000 },
      { item: { id: 'MLA2', title: 'Producto; B' }, quantity: 1, unit_price: 500 },
    ],
  },
];

test('aggregateSales calcula métricas, rellena días sin ventas y ordena productos', () => {
  const result = aggregateSales(orders, range);
  assert.equal(result.summary.totalRevenue, 3500);
  assert.equal(result.summary.orders, 2);
  assert.equal(result.summary.units, 4);
  assert.equal(result.summary.averageTicket, 1750);
  assert.equal(result.summary.uniqueBuyers, 1);
  assert.equal(result.timeline.length, 3);
  assert.deepEqual(result.timeline[1], { date: '2026-09-02', revenue: 0, orders: 0, units: 0 });
  assert.equal(result.topProducts[0].itemId, 'MLA1');
  assert.equal(result.topProducts[0].revenue, 3000);
});

test('validateDateRange rechaza rangos invertidos o superiores a un año', () => {
  assert.throws(() => validateDateRange('2026-09-03', '2026-09-01'), /posterior/);
  assert.throws(() => validateDateRange('2024-01-01', '2026-01-01'), /máximo/);
  assert.throws(() => validateDateRange('2026-02-31', '2026-03-02'), /no es válido/);
});

test('createSalesCsv genera un CSV compatible con separador regional y escapa contenido', () => {
  const maliciousTitle = [{ ...orders[0], order_items: [{ ...orders[0].order_items[0], item: { id: 'MLA1', title: '=1+1' } }] }];
  const csv = createSalesCsv([...orders, ...maliciousTitle]);
  assert.match(csv, /^\uFEFFsep=;/);
  assert.match(csv, /"Producto; B"/);
  assert.match(csv, /"2000,00"/);
  assert.match(csv, /"'=1\+1"/);
});
