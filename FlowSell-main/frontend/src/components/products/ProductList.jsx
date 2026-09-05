import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from 'react-modal';
import { FiExternalLink, FiLayers, FiPackage, FiRefreshCw, FiSliders, FiTag } from 'react-icons/fi';
import { toast } from 'react-toastify';
import TemplateModal from '../templates/TemplateModal.jsx';
import useGetProducts from '../../hooks/useGetProducts.js';
import ProductSearch from './searchInputs/productSearch/ProductsSearch.jsx';
import Spinner from '../spinner/Spinner.jsx';
import PaginatedList from './PaginatedList.jsx';
import PageHeader from '../common/PageHeader.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { formatCurrency, formatNumber } from '../../utils/formatters.js';

Modal.setAppElement('#root');

const ProductList = () => {
  const { products, error, loading, reloadProducts } = useGetProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredByStatus = useMemo(() => products.filter((product) => {
    if (statusFilter === 'active') return !product.status || product.status === 'active';
    if (statusFilter === 'variations') return product.variations?.length > 0;
    return true;
  }), [products, statusFilter]);

  const variationCount = products.reduce((total, product) => total + (product.variations?.length || 0), 0);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Catálogo sincronizado"
        title="Publicaciones"
        description="Elegí qué mensajes se enviarán automáticamente después de cada venta."
        actions={<Link to="/app/automations" className="button button--secondary"><FiLayers /> Ver flujos configurados</Link>}
      />

      <section className="summary-strip">
        <div><span><FiPackage /></span><p><strong>{formatNumber(products.length)}</strong><small>Publicaciones encontradas</small></p></div>
        <div><span><FiTag /></span><p><strong>{formatNumber(variationCount)}</strong><small>Variantes disponibles</small></p></div>
        <div><span><FiRefreshCw /></span><p><strong>En línea</strong><small>Sincronización con Mercado Libre</small></p></div>
      </section>

      <section className="panel catalog-panel">
        <div className="toolbar">
          <div className="toolbar__search"><ProductSearch value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por título o ID…" /></div>
          <label className="filter-select">
            <FiSliders />
            <span className="sr-only">Filtrar publicaciones</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todas las publicaciones</option>
              <option value="active">Publicaciones activas</option>
              <option value="variations">Con variantes</option>
            </select>
          </label>
          <button className="button button--ghost button--icon-mobile" type="button" onClick={reloadProducts} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} /> <span>Actualizar</span>
          </button>
        </div>

        {loading ? (
          <div className="section-loader"><Spinner loading size={38} color="#3483fa" /><p>Sincronizando publicaciones…</p></div>
        ) : error ? (
          <EmptyState
            icon={FiRefreshCw}
            title="No pudimos cargar tus publicaciones"
            description={error}
            action={<button className="button button--primary" type="button" onClick={reloadProducts}>Intentar nuevamente</button>}
          />
        ) : (
          <PaginatedList
            items={filteredByStatus}
            searchTerm={searchTerm}
            itemsPerPage={12}
            filterBy={['title', 'id']}
            emptyState={<EmptyState icon={FiPackage} title="No encontramos publicaciones" description="Probá con otra búsqueda o actualizá la sincronización." />}
            renderItem={(product) => (
              <article key={product.id} className="catalog-card">
                <div className="catalog-card__image">
                  {product.thumbnail ? <img src={product.thumbnail} alt="" /> : <FiPackage />}
                  <span className={`status-badge ${product.status === 'paused' ? 'status-badge--warning' : 'status-badge--success'}`}>
                    {product.status === 'paused' ? 'Pausada' : 'Activa'}
                  </span>
                </div>
                <div className="catalog-card__body">
                  <span className="catalog-card__id">{product.id}</span>
                  <h3>{product.title}</h3>
                  <div className="catalog-card__metadata">
                    {product.price != null && <span>{formatCurrency(product.price, product.currency_id || 'ARS')}</span>}
                    <span>{product.variations?.length || 0} variantes</span>
                    {product.sold_quantity != null && <span>{formatNumber(product.sold_quantity)} vendidas</span>}
                  </div>
                </div>
                <div className="catalog-card__actions">
                  {product.permalink && <a href={product.permalink} target="_blank" rel="noreferrer" className="icon-button" aria-label="Ver en Mercado Libre" title="Ver en Mercado Libre"><FiExternalLink /></a>}
                  <button className="button button--primary button--small" type="button" onClick={() => setSelectedProduct(product)}>Configurar mensajes</button>
                </div>
              </article>
            )}
          />
        )}
      </section>

      <Modal
        isOpen={Boolean(selectedProduct)}
        onRequestClose={() => setSelectedProduct(null)}
        className="app-modal app-modal--large"
        overlayClassName="app-modal-overlay"
        contentLabel="Configurar mensajes automáticos"
      >
        {selectedProduct && (
          <TemplateModal
            product={selectedProduct}
            closeModal={() => setSelectedProduct(null)}
            onAssigned={() => toast.success('Flujo automático actualizado correctamente.')}
          />
        )}
      </Modal>
    </div>
  );
};

export default ProductList;
