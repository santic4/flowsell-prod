import { formatCurrency, formatNumber, getDateRange } from './utils/formatters.js';

test('formatea métricas comerciales para Argentina', () => {
  expect(formatCurrency(125000.5, 'ARS')).toContain('125.000,50');
  expect(formatNumber(1234)).toBe('1.234');
});

test('genera un rango inclusivo de treinta días', () => {
  const range = getDateRange(30, new Date('2026-09-05T12:00:00.000Z'));
  expect(range).toEqual({ from: '2026-08-07', to: '2026-09-05' });
});
