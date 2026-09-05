import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from 'react-modal';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiClock,
  FiFileText,
  FiLayers,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import useGetSavedProducts from '../../hooks/useGetSavedProducts.js';
import useGetTemplates from '../../hooks/useGetTemplates.js';
import { apiRequest } from '../../api/api.js';
import PageHeader from '../common/PageHeader.jsx';
import SearchField from '../common/SearchField.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Spinner from '../spinner/Spinner.jsx';
import TemplateModal from '../templates/TemplateModal.jsx';

Modal.setAppElement('#root');

const templateIdOf = (template) => String(template?.templateId?._id || template?.templateId || template?._id || '');

const TemplateSelector = ({ templates, selected, onChange, search, onSearch, multiple = true }) => {
  const filtered = templates.filter((template) => `${template.name} ${template.content}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <SearchField value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar una plantilla…" label="Buscar plantilla" />
      <div className="template-picker">
        {filtered.map((template) => {
          const id = String(template._id);
          const isSelected = multiple ? selected.includes(id) : selected === id;
          return (
            <button key={id} type="button" className={`template-option ${isSelected ? 'template-option--selected' : ''}`} onClick={() => onChange(id)}>
              <span className="template-option__check">{isSelected && <FiCheck />}</span>
              <span><strong>{template.name}</strong><small>{template.content}</small></span>
              {template.attachments?.length > 0 && <b>{template.attachments.length} img.</b>}
            </button>
          );
        })}
      </div>
    </>
  );
};

const DelayControl = ({ product, saving, onSave }) => {
  const [hours, setHours] = useState(product.secondMessageDelay || 24);

  useEffect(() => {
    setHours(product.secondMessageDelay || 24);
  }, [product.secondMessageDelay]);

  return (
    <div className="delay-control">
      <label htmlFor={`delay-${product.id}`}>Espera entre mensajes</label>
      <div>
        <input id={`delay-${product.id}`} type="number" min="1" max="72" value={hours} onChange={(event) => setHours(event.target.value)} />
        <span>horas</span>
        <button type="button" className="button button--secondary button--small" onClick={() => onSave(product.id, Number(hours))} disabled={saving}>Guardar</button>
      </div>
      <small>Podés elegir entre 1 y 72 horas.</small>
    </div>
  );
};

const TemplateSequence = ({ productId, templates = [], variationId, processing, onMove, onDelete, allowReorder = true }) => {
  if (!templates.length) return <p className="automation-empty">No hay mensajes asignados.</p>;
  return (
    <div className="sequence-list">
      {templates.map((template, index) => {
        const id = templateIdOf(template);
        return (
          <div className="sequence-item" key={`${variationId || 'global'}-${id}-${index}`}>
            <span className="sequence-item__order">{index + 1}</span>
            <strong>{template.name || template.templateId?.name || 'Plantilla'}</strong>
            <div>
              {allowReorder && <button type="button" onClick={() => onMove(productId, id, 'up', variationId)} disabled={index === 0 || processing} aria-label="Mover arriba"><FiArrowUp /></button>}
              {allowReorder && <button type="button" onClick={() => onMove(productId, id, 'down', variationId)} disabled={index === templates.length - 1 || processing} aria-label="Mover abajo"><FiArrowDown /></button>}
              <button type="button" className="sequence-item__delete" onClick={() => onDelete(productId, id, variationId)} disabled={processing} aria-label="Quitar plantilla"><FiTrash2 /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SavedProducts = () => {
  const { products, error, loading, reloadProducts } = useGetSavedProducts();
  const { templates, error: templatesError, loading: templatesLoading } = useGetTemplates();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [secondProduct, setSecondProduct] = useState(null);
  const [secondSelection, setSecondSelection] = useState([]);
  const [secondSearch, setSecondSearch] = useState('');
  const [assignAllOpen, setAssignAllOpen] = useState(false);
  const [assignAllSelection, setAssignAllSelection] = useState('');
  const [assignAllSearch, setAssignAllSearch] = useState('');
  const [processing, setProcessing] = useState('');

  const filteredProducts = useMemo(() => products.filter((product) =>
    `${product.title} ${product.id}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [products, searchTerm]);

  const delayedFlows = products.filter((product) => product.secondMessages?.length > 0).length;
  const immediateMessages = products.reduce((total, product) => {
    if (product.variations?.length) return total + product.variations.reduce((sum, variation) => sum + (variation.templates?.length || 0), 0);
    return total + (product.templates?.length || 0);
  }, 0);

  const runAction = async (key, action, successMessage) => {
    setProcessing(key);
    try {
      await action();
      await reloadProducts();
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (requestError) {
      toast.error(requestError.message);
      return false;
    } finally {
      setProcessing('');
    }
  };

  const handleMove = (productId, templateId, direction, variationId) => runAction(
    `move-${productId}-${templateId}`,
    () => apiRequest(`/api/products/${productId}/templates/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ templateId, direction, variationId: variationId || null }),
    })
  );

  const handleDeleteTemplate = (productId, templateId, variationId) => runAction(
    `delete-${productId}-${templateId}`,
    () => apiRequest(`/api/products/${productId}/templates/${templateId}${variationId ? `?variationId=${encodeURIComponent(variationId)}` : ''}`, { method: 'DELETE' }),
    'Plantilla quitada del flujo.'
  );

  const handleDeleteSecondTemplate = (productId, templateId) => runAction(
    `delete-second-${productId}-${templateId}`,
    () => apiRequest(`/api/products/${productId}/second-template/${templateId}`, { method: 'DELETE' }),
    'Mensaje programado quitado.'
  );

  const handleSaveDelay = (productId, delayHours) => {
    if (!Number.isFinite(delayHours) || delayHours < 1 || delayHours > 72) {
      toast.warning('El tiempo de espera debe estar entre 1 y 72 horas.');
      return;
    }
    runAction(
      `delay-${productId}`,
      () => apiRequest(`/api/products/${productId}/assign-delay`, { method: 'POST', body: JSON.stringify({ delayHours }) }),
      'Tiempo de espera actualizado.'
    );
  };

  const openSecondMessages = (product) => {
    setSecondProduct(product);
    setSecondSelection((product.secondMessages || []).map(templateIdOf));
    setSecondSearch('');
  };

  const saveSecondMessages = async () => {
    const saved = await runAction(
      `second-${secondProduct.id}`,
      () => apiRequest(`/api/templates/${secondProduct.id}/assign-second-messages`, {
        method: 'POST',
        body: JSON.stringify({ templateIds: secondSelection }),
      }),
      'Seguimiento programado actualizado.'
    );
    if (saved) setSecondProduct(null);
  };

  const handleAssignAll = async () => {
    if (!assignAllSelection) {
      toast.warning('Seleccioná una plantilla.');
      return;
    }
    const saved = await runAction(
      'assign-all',
      () => apiRequest('/api/products/assign-template-to-all', { method: 'POST', body: JSON.stringify({ templateId: assignAllSelection }) }),
      'Plantilla aplicada a todos los flujos actuales.'
    );
    if (saved) {
      setAssignAllOpen(false);
      setAssignAllSelection('');
    }
  };

  const handleRemoveProduct = async (product) => {
    const result = await Swal.fire({
      title: '¿Quitar este flujo?',
      text: 'La publicación seguirá en Mercado Libre, pero dejará de tener mensajes automáticos en Flow Sell.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Quitar flujo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e5484d',
      cancelButtonColor: '#64748b',
    });
    if (!result.isConfirmed) return;
    runAction(`remove-${product.id}`, () => apiRequest(`/api/products/${product.id}/saved-product`, { method: 'DELETE' }), 'Flujo eliminado.');
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Mensajería posventa"
        title="Flujos automáticos"
        description="Controlá el orden de los mensajes inmediatos y programá seguimientos para cada publicación."
        actions={<Link to="/app/products" className="button button--primary"><FiPlus /> Crear nuevo flujo</Link>}
      />

      <section className="summary-strip">
        <div><span><FiLayers /></span><p><strong>{products.length}</strong><small>Flujos configurados</small></p></div>
        <div><span><FiZap /></span><p><strong>{immediateMessages}</strong><small>Mensajes inmediatos</small></p></div>
        <div><span><FiClock /></span><p><strong>{delayedFlows}</strong><small>Seguimientos activos</small></p></div>
      </section>

      <section className="panel automation-list-panel">
        <div className="toolbar">
          <div className="toolbar__search"><SearchField value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por publicación o ID…" label="Buscar flujo" /></div>
          <button type="button" className="button button--secondary" onClick={() => setAssignAllOpen(true)} disabled={!products.length}><FiFileText /> Aplicar plantilla a todos</button>
          <button type="button" className="button button--ghost button--icon-mobile" onClick={reloadProducts} disabled={loading}><FiRefreshCw className={loading ? 'spin' : ''} /><span>Actualizar</span></button>
        </div>

        {loading ? (
          <div className="section-loader"><Spinner loading size={38} color="#3483fa" /><p>Cargando automatizaciones…</p></div>
        ) : error ? (
          <EmptyState icon={FiRefreshCw} title="No pudimos cargar tus flujos" description={error} action={<button type="button" className="button button--primary" onClick={reloadProducts}>Reintentar</button>} />
        ) : !filteredProducts.length ? (
          <EmptyState icon={FiLayers} title={searchTerm ? 'No hay coincidencias' : 'Todavía no configuraste flujos'} description={searchTerm ? 'Probá con otra búsqueda.' : 'Elegí una publicación y asignale una plantilla para comenzar.'} action={!searchTerm && <Link to="/app/products" className="button button--primary">Ver publicaciones</Link>} />
        ) : (
          <div className="automation-list">
            {filteredProducts.map((product) => (
              <article className="automation-card" key={product.id}>
                <header className="automation-card__header">
                  <span className="automation-card__icon"><FiPackage /></span>
                  <div><span>{product.id}</span><h2>{product.title}</h2></div>
                  <span className="status-badge status-badge--success"><FiZap /> Activo</span>
                </header>

                <div className="automation-card__body">
                  <section className="automation-column">
                    <div className="automation-column__heading"><span><FiZap /></span><div><h3>Mensaje inmediato</h3><p>Se envía cuando se confirma la venta.</p></div></div>
                    {product.variations?.length ? product.variations.map((variation) => (
                      <div className="variation-flow" key={variation.id}>
                        <span className="variation-flow__label">{variation.name || `Variante ${variation.id}`}</span>
                        <TemplateSequence productId={product.id} templates={variation.templates || []} variationId={variation.id} processing={Boolean(processing)} onMove={handleMove} onDelete={handleDeleteTemplate} />
                      </div>
                    )) : (
                      <TemplateSequence productId={product.id} templates={product.templates || []} processing={Boolean(processing)} onMove={handleMove} onDelete={handleDeleteTemplate} />
                    )}
                    <button type="button" className="button button--secondary button--small button--fit" onClick={() => setEditingProduct(product)}><FiPlus /> Editar secuencia</button>
                  </section>

                  <section className="automation-column automation-column--delayed">
                    <div className="automation-column__heading"><span><FiClock /></span><div><h3>Seguimiento programado</h3><p>Se envía después del tiempo indicado.</p></div></div>
                    <DelayControl product={product} saving={processing === `delay-${product.id}`} onSave={handleSaveDelay} />
                    <TemplateSequence productId={product.id} templates={product.secondMessages || []} processing={Boolean(processing)} onMove={() => {}} onDelete={handleDeleteSecondTemplate} allowReorder={false} />
                    <button type="button" className="button button--secondary button--small button--fit" onClick={() => openSecondMessages(product)}><FiPlus /> Configurar seguimiento</button>
                  </section>
                </div>

                <footer className="automation-card__footer">
                  <span>Los cambios se aplican a las próximas ventas.</span>
                  <button type="button" className="danger-link" onClick={() => handleRemoveProduct(product)} disabled={processing === `remove-${product.id}`}><FiTrash2 /> Quitar flujo</button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={Boolean(editingProduct)} onRequestClose={() => setEditingProduct(null)} className="app-modal app-modal--large" overlayClassName="app-modal-overlay" contentLabel="Editar mensajes inmediatos">
        {editingProduct && <TemplateModal product={editingProduct} closeModal={() => setEditingProduct(null)} allowEmpty onAssigned={() => { reloadProducts(); toast.success('Secuencia actualizada.'); }} />}
      </Modal>

      <Modal isOpen={Boolean(secondProduct)} onRequestClose={() => setSecondProduct(null)} className="app-modal app-modal--large" overlayClassName="app-modal-overlay" contentLabel="Configurar seguimiento programado">
        {secondProduct && (
          <div className="modal-shell">
            <div className="modal-shell__header"><div><span className="modal-shell__eyebrow"><FiClock /> Seguimiento</span><h2>Mensajes programados</h2><p>{secondProduct.title}</p></div><button type="button" className="icon-button" onClick={() => setSecondProduct(null)} aria-label="Cerrar"><FiX /></button></div>
            <div className="modal-shell__body">
              {templatesLoading ? <div className="section-loader section-loader--compact"><Spinner loading size={32} color="#3483fa" /></div> : templatesError ? <div className="form-alert form-alert--error">{templatesError}</div> : !templates.length ? <EmptyState icon={FiFileText} title="No hay plantillas disponibles" description="Creá una plantilla antes de configurar el seguimiento." /> : <TemplateSelector templates={templates} selected={secondSelection} onChange={(id) => setSecondSelection((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} search={secondSearch} onSearch={setSecondSearch} />}
            </div>
            <div className="modal-shell__footer"><span>{secondSelection.length} seleccionada{secondSelection.length === 1 ? '' : 's'}</span><div><button type="button" className="button button--ghost" onClick={() => setSecondProduct(null)}>Cancelar</button><button type="button" className="button button--primary" onClick={saveSecondMessages} disabled={Boolean(processing)}>Guardar seguimiento</button></div></div>
          </div>
        )}
      </Modal>

      <Modal isOpen={assignAllOpen} onRequestClose={() => setAssignAllOpen(false)} className="app-modal app-modal--large" overlayClassName="app-modal-overlay" contentLabel="Aplicar plantilla a todos los flujos">
        <div className="modal-shell">
          <div className="modal-shell__header"><div><span className="modal-shell__eyebrow"><FiLayers /> Acción masiva</span><h2>Aplicar una plantilla a todos</h2><p>Se agregará al final de cada secuencia configurada, sin duplicados.</p></div><button type="button" className="icon-button" onClick={() => setAssignAllOpen(false)} aria-label="Cerrar"><FiX /></button></div>
          <div className="modal-shell__body">
            {templatesLoading ? <div className="section-loader section-loader--compact"><Spinner loading size={32} color="#3483fa" /></div> : !templates.length ? <EmptyState icon={FiFileText} title="No hay plantillas disponibles" description="Creá una plantilla para poder aplicarla." /> : <TemplateSelector templates={templates} selected={assignAllSelection} onChange={setAssignAllSelection} search={assignAllSearch} onSearch={setAssignAllSearch} multiple={false} />}
          </div>
          <div className="modal-shell__footer"><span>{products.length} flujos serán revisados</span><div><button type="button" className="button button--ghost" onClick={() => setAssignAllOpen(false)}>Cancelar</button><button type="button" className="button button--primary" onClick={handleAssignAll} disabled={!assignAllSelection || processing === 'assign-all'}>Aplicar plantilla</button></div></div>
        </div>
      </Modal>
    </div>
  );
};

export default SavedProducts;
