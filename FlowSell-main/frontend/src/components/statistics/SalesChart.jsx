import { useId } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const SalesChart = ({ data = [], currency = 'ARS', compact = false }) => {
  const rawId = useId();
  const gradientId = `sales-gradient-${rawId.replace(/:/g, '')}`;
  const width = compact ? 620 : 820;
  const height = compact ? 210 : 280;
  const padding = compact ? { top: 20, right: 18, bottom: 38, left: 18 } : { top: 24, right: 24, bottom: 46, left: 74 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((point) => Number(point.revenue) || 0), 1);
  const divisor = Math.max(data.length - 1, 1);
  const points = data.map((point, index) => ({
    ...point,
    x: padding.left + (index / divisor) * plotWidth,
    y: padding.top + plotHeight - ((Number(point.revenue) || 0) / maxValue) * plotHeight,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`
    : '';
  const labelIndexes = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);
  if (!compact && data.length > 6) {
    labelIndexes.add(Math.floor((data.length - 1) / 4));
    labelIndexes.add(Math.floor(((data.length - 1) * 3) / 4));
  }

  if (!data.length) return <div className="chart-empty">Todavía no hay ventas para graficar.</div>;

  return (
    <div className={`sales-chart ${compact ? 'sales-chart--compact' : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución diaria de ventas">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3483fa" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3483fa" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + ratio * plotHeight;
          const value = maxValue * (1 - ratio);
          return (
            <g key={ratio}>
              <line className="sales-chart__grid" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              {!compact && <text className="sales-chart__axis" x={padding.left - 10} y={y + 4} textAnchor="end">{formatCurrency(value, currency, true)}</text>}
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path className="sales-chart__line" d={linePath} />

        {points.map((point, index) => (
          <g key={point.date}>
            <circle className="sales-chart__point" cx={point.x} cy={point.y} r={compact ? 3 : 4}>
              <title>{`${formatDate(point.date)}: ${formatCurrency(point.revenue, currency)}`}</title>
            </circle>
            {labelIndexes.has(index) && (
              <text className="sales-chart__date" x={point.x} y={height - 12} textAnchor="middle">{formatDate(point.date)}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default SalesChart;
