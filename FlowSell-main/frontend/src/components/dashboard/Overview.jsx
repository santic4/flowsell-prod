import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiLayers,
  FiPackage,
  FiSend,
  FiTrendingUp,
} from 'react-icons/fi';
import PageHeader from '../common/PageHeader.jsx';
import SalesChart from '../statistics/SalesChart.jsx';
import useGetProducts from '../../hooks/useGetProducts.js';
import useGetSavedProducts from '../../hooks/useGetSavedProducts.js';
import useGetTemplates from '../../hooks/useGetTemplates.js';
import useSalesStatistics from '../../hooks/useSalesStatistics.js';
import { formatCurrency, formatDate, formatNumber, getDateRange } from '../../utils/formatters.js';
import {useAccount} from '../account/AccountContext.jsx';

const MetricCard = ({ label, value, detail, icon: Icon, accent = 'blue', loading }) => (
  <article className="metric-card">
    <div className={`metric-card__icon metric-card__icon--${accent}`}><Icon /></div>
    <div>
      <span>{label}</span>
      <strong className={loading ? 'skeleton skeleton--value' : ''}>{loading ? '' : value}</strong>
      <small>{detail}</small>
    </div>
  </article>
);

const Overview = () => {
  const {account}=useAccount();
  const days=Math.min(30,account.plan.statisticsDays);
  const range = getDateRange(days);
  const { total:catalogTotal, loading: productsLoading } = useGetProducts();
  const { products: automatedProducts, loading: automationsLoading } = useGetSavedProducts();
  const { templates, loading: templatesLoading } = useGetTemplates();
  const { data: sales, loading: salesLoading, error: salesError } = useSalesStatistics(range);
  const currency = sales?.meta?.currencyId || 'ARS';
  const summary = sales?.summary || {};
  const activeFlows=automatedProducts.filter(p=>p.effectiveActive).length;
  const automationCoverage = catalogTotal
    ? Math.round((activeFlows / catalogTotal) * 100)
    : 0;

  const recentOrders = sales?.recentOrders?.slice(0, 4) || [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Tu operación, de un vistazo"
        title="Resumen"
        description="Revisá el rendimiento de la cuenta y continuá con las tareas más importantes."
        actions={<Link to="/app/products" className="button button--primary"><FiPackage /> Gestionar publicaciones</Link>}
      />

      <section className="overview-hero">
        <div className="overview-hero__copy">
          <span className="overview-hero__eyebrow"><FiTrendingUp /> Últimos {days} días</span>
          <p>Ventas procesadas</p>
          <strong className={salesLoading ? 'skeleton skeleton--hero' : ''}>
            {salesLoading ? '' : formatCurrency(summary.totalRevenue, currency)}
          </strong>
          <small>{salesError ? 'No pudimos sincronizar las ventas en este momento.' : `${formatNumber(summary.orders)} órdenes · ${formatNumber(summary.units)} unidades`}</small>
          <Link to="/app/statistics">Ver análisis completo <FiArrowRight /></Link>
        </div>
        <div className="overview-hero__chart">
          <SalesChart data={sales?.timeline || []} currency={currency} compact />
        </div>
      </section>

      <section className="metrics-grid" aria-label="Indicadores principales">
        <MetricCard label="Publicaciones" value={formatNumber(catalogTotal)} detail="Sincronizadas con Mercado Libre" icon={FiPackage} accent="blue" loading={productsLoading} />
        <MetricCard label="Flujos activos" value={formatNumber(activeFlows)} detail={`${automationCoverage}% del catálogo cubierto`} icon={FiLayers} accent="violet" loading={automationsLoading || productsLoading} />
        <MetricCard label="Plantillas" value={formatNumber(templates.length)} detail="Mensajes listos para usar" icon={FiFileText} accent="amber" loading={templatesLoading} />
        <MetricCard label="Ticket promedio" value={formatCurrency(summary.averageTicket, currency)} detail="Promedio del período" icon={FiBarChart2} accent="green" loading={salesLoading} />
      </section>

      <section className="overview-grid">
        <article className="panel panel--flush">
          <div className="panel__header panel__header--padded">
            <div>
              <span className="panel__eyebrow">Actividad comercial</span>
              <h2>Ventas recientes</h2>
            </div>
            <Link to="/app/statistics" className="text-link">Ver todas <FiArrowRight /></Link>
          </div>
          {recentOrders.length ? (
            <div className="activity-list">
              {recentOrders.map((order) => (
                <div className="activity-row" key={order.orderId}>
                  <span className="activity-row__icon"><FiCheckCircle /></span>
                  <div>
                    <strong>Venta #{order.orderId}</strong>
                    <small>{order.items?.[0]?.title || `${order.itemsCount || 0} producto(s)`} · {formatDate(order.date, { year: 'numeric' })}</small>
                  </div>
                  <b>{formatCurrency(order.total, order.currencyId || currency)}</b>
                </div>
              ))}
            </div>
          ) : (
            <div className="inline-empty"><FiClock /><span><strong>Sin ventas en el período</strong><small>Las nuevas operaciones van a aparecer acá.</small></span></div>
          )}
        </article>

        <article className="panel setup-panel">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">Puesta en marcha</span>
              <h2>Estado de automatización</h2>
            </div>
            <span className="coverage-badge">{automationCoverage}%</span>
          </div>
          <div className="coverage-track"><span style={{ width: `${Math.min(automationCoverage, 100)}%` }} /></div>
          <div className="setup-list">
            <Link to="/app/templates" className={templates.length ? 'setup-item setup-item--done' : 'setup-item'}>
              <span>{templates.length ? <FiCheckCircle /> : '1'}</span>
              <div><strong>Crear mensajes</strong><small>{templates.length ? `${templates.length} plantillas disponibles` : 'Prepará tu primera plantilla'}</small></div>
              <FiArrowRight />
            </Link>
            <Link to="/app/products" className={automatedProducts.length ? 'setup-item setup-item--done' : 'setup-item'}>
              <span>{automatedProducts.length ? <FiCheckCircle /> : '2'}</span>
              <div><strong>Asignar publicaciones</strong><small>{automatedProducts.length ? `${automatedProducts.length} publicaciones configuradas` : 'Elegí dónde se enviará cada mensaje'}</small></div>
              <FiArrowRight />
            </Link>
            <Link to="/app/campaigns" className="setup-item">
              <span><FiSend /></span>
              <div><strong>Crear una campaña</strong><small>Volvé a contactar compradores anteriores</small></div>
              <FiArrowRight />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Overview;
