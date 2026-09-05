import { useState } from 'react';
import {
  FiBarChart2,
  FiCalendar,
  FiDownload,
  FiDollarSign,
  FiPackage,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Spinner from '../spinner/Spinner.jsx';
import SalesChart from './SalesChart.jsx';
import useSalesStatistics from '../../hooks/useSalesStatistics.js';
import { apiUrl } from '../../api/api.js';
import { formatCurrency, formatDate, formatNumber, getDateRange } from '../../utils/formatters.js';

const presets = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
];

const Statistics = () => {
  const [draftRange, setDraftRange] = useState(getDateRange(30));
  const [appliedRange, setAppliedRange] = useState(getDateRange(30));
  const [activePreset, setActivePreset] = useState(30);
  const [exporting, setExporting] = useState(false);
  const { data, loading, error, refresh } = useSalesStatistics(appliedRange);
  const summary = data?.summary || {};
  const currency = data?.meta?.currencyId || 'ARS';
  const maxProductRevenue = Math.max(...(data?.topProducts || []).map((product) => product.revenue), 1);

  const selectPreset = (days) => {
    const range = getDateRange(days);
    setActivePreset(days);
    setDraftRange(range);
    setAppliedRange(range);
  };

  const applyRange = () => {
    if (!draftRange.from || !draftRange.to || new Date(draftRange.from) > new Date(draftRange.to)) {
      toast.warning('Revisá el rango de fechas.');
      return;
    }
    setActivePreset(null);
    setAppliedRange(draftRange);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch(apiUrl(`/api/statistics/sales/export?from=${encodeURIComponent(appliedRange.from)}&to=${encodeURIComponent(appliedRange.to)}`), { credentials: 'include' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'No se pudo generar el archivo.');
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `flowsell-ventas-${appliedRange.from}-a-${appliedRange.to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      toast.success('Reporte exportado correctamente.');
    } catch (exportError) {
      toast.error(exportError.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Datos de tu cuenta"
        title="Ventas y estadísticas"
        description="Analizá las ventas pagadas de la cuenta de Mercado Libre conectada."
        actions={(
          <button type="button" className="button button--primary" onClick={exportCsv} disabled={exporting || loading || Boolean(error)}>
            {exporting ? <><Spinner loading size={16} color="#fff" /> Exportando…</> : <><FiDownload /> Exportar CSV</>}
          </button>
        )}
      />

      <section className="panel date-filter-panel">
        <div className="date-presets">{presets.map((preset) => <button type="button" key={preset.days} className={activePreset === preset.days ? 'date-preset date-preset--active' : 'date-preset'} onClick={() => selectPreset(preset.days)}>{preset.label}</button>)}</div>
        <div className="date-filter-fields">
          <label><span>Desde</span><div className="input-with-icon"><FiCalendar /><input type="date" value={draftRange.from} max={draftRange.to} onChange={(event) => setDraftRange((range) => ({ ...range, from: event.target.value }))} /></div></label>
          <label><span>Hasta</span><div className="input-with-icon"><FiCalendar /><input type="date" value={draftRange.to} min={draftRange.from} max={getDateRange(1).to} onChange={(event) => setDraftRange((range) => ({ ...range, to: event.target.value }))} /></div></label>
          <button type="button" className="button button--secondary" onClick={applyRange}>Aplicar período</button>
          <button type="button" className="icon-button" onClick={refresh} title="Actualizar datos" aria-label="Actualizar datos"><FiRefreshCw className={loading ? 'spin' : ''} /></button>
        </div>
      </section>

      {loading ? (
        <section className="panel statistics-loading"><Spinner loading size={42} color="#3483fa" /><div><h2>Sincronizando ventas</h2><p>Estamos consultando las operaciones del período seleccionado.</p></div></section>
      ) : error ? (
        <section className="panel"><EmptyState icon={FiRefreshCw} title="No pudimos obtener las estadísticas" description={error.message} action={<button type="button" className="button button--primary" onClick={refresh}>Intentar nuevamente</button>} /></section>
      ) : (
        <>
          <section className="metrics-grid metrics-grid--five" aria-label="Métricas de ventas">
            <article className="metric-card metric-card--featured"><div className="metric-card__icon metric-card__icon--blue"><FiDollarSign /></div><div><span>Ventas totales</span><strong>{formatCurrency(summary.totalRevenue, currency)}</strong><small>Facturación bruta del período</small></div></article>
            <article className="metric-card"><div className="metric-card__icon metric-card__icon--violet"><FiShoppingBag /></div><div><span>Órdenes pagadas</span><strong>{formatNumber(summary.orders)}</strong><small>Operaciones confirmadas</small></div></article>
            <article className="metric-card"><div className="metric-card__icon metric-card__icon--amber"><FiPackage /></div><div><span>Unidades vendidas</span><strong>{formatNumber(summary.units)}</strong><small>Productos del período</small></div></article>
            <article className="metric-card"><div className="metric-card__icon metric-card__icon--green"><FiTrendingUp /></div><div><span>Ticket promedio</span><strong>{formatCurrency(summary.averageTicket, currency)}</strong><small>Valor medio por orden</small></div></article>
            <article className="metric-card"><div className="metric-card__icon metric-card__icon--cyan"><FiUsers /></div><div><span>Compradores</span><strong>{formatNumber(summary.uniqueBuyers)}</strong><small>Clientes únicos</small></div></article>
          </section>

          {!summary.orders ? (
            <section className="panel"><EmptyState icon={FiBarChart2} title="No hubo ventas pagadas en este período" description="Elegí un rango más amplio para analizar el rendimiento de tu cuenta." /></section>
          ) : (
            <>
              <section className="panel chart-panel">
                <div className="panel__header"><div><span className="panel__eyebrow">Evolución diaria</span><h2>Ventas por día</h2></div><span className="data-source-badge">Datos de Mercado Libre</span></div>
                <SalesChart data={data.timeline} currency={currency} />
              </section>

              <div className="statistics-grid">
                <section className="panel">
                  <div className="panel__header"><div><span className="panel__eyebrow">Rendimiento del catálogo</span><h2>Productos más vendidos</h2></div></div>
                  <div className="top-products-list">
                    {(data.topProducts || []).slice(0, 8).map((product, index) => (
                      <div className="top-product" key={product.itemId}>
                        <span className="top-product__rank">{String(index + 1).padStart(2, '0')}</span>
                        <div className="top-product__copy"><strong>{product.title}</strong><small>{formatNumber(product.quantity)} unidades · {formatNumber(product.orders)} órdenes</small><div className="top-product__bar"><span style={{ width: `${Math.max((product.revenue / maxProductRevenue) * 100, 3)}%` }} /></div></div>
                        <b>{formatCurrency(product.revenue, currency)}</b>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="panel panel--flush">
                  <div className="panel__header panel__header--padded"><div><span className="panel__eyebrow">Últimos movimientos</span><h2>Órdenes recientes</h2></div></div>
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Orden</th><th>Fecha</th><th>Comprador</th><th>Productos</th><th className="align-right">Total</th></tr></thead>
                      <tbody>{(data.recentOrders || []).map((order) => <tr key={order.orderId}><td><strong>#{order.orderId}</strong></td><td>{formatDate(order.date, { year: 'numeric' })}</td><td>{order.buyerNickname || `ID ${order.buyerId}`}</td><td>{order.itemsCount}</td><td className="align-right"><strong>{formatCurrency(order.total, order.currencyId || currency)}</strong></td></tr>)}</tbody>
                    </table>
                  </div>
                </section>
              </div>
            </>
          )}

          <p className="statistics-footnote">Actualizado {data?.meta?.generatedAt ? formatDate(data.meta.generatedAt, { year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recientemente'}. Cada sesión muestra únicamente los datos de la cuenta autenticada.</p>
        </>
      )}
    </div>
  );
};

export default Statistics;
