export const formatNumber = (value = 0) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Number(value) || 0);

export const formatCurrency = (value = 0, currency = 'ARS', compact = false) => {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      maximumFractionDigits: compact ? 0 : 2,
      notation: compact ? 'compact' : 'standard',
    }).format(Number(value) || 0);
  } catch {
    return `$ ${formatNumber(value)}`;
  }
};

export const formatDate = (value, options = {}) => {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    ...options,
  }).format(date);
};

export const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateRange = (days = 30, endDate = new Date()) => {
  const end = new Date(endDate);
  const start = new Date(endDate);
  start.setDate(start.getDate() - Math.max(days - 1, 0));
  return { from: toInputDate(start), to: toInputDate(end) };
};
