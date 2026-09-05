import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { FiCalendar, FiCheck, FiFileText, FiPackage, FiSearch, FiSend, FiUsers, FiX } from 'react-icons/fi';
import { useBuyers } from '../../hooks/useTrackingClient.js';
import { useJobStatus } from '../../hooks/useJobStatus.js';
import useGetProducts from '../../hooks/useGetProducts.js';
import useGetTemplates from '../../hooks/useGetTemplates.js';
import { useSendMessagesMassive } from '../../hooks/useSendMessagesMassive.js';
import PageHeader from '../common/PageHeader.jsx';
import SearchField from '../common/SearchField.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Spinner from '../spinner/Spinner.jsx';
import PaginatedList from '../products/PaginatedList.jsx';
import BuyersResults from './BuyersResults.jsx';
import SelectedItemsList from './SelectedItemsList.jsx';
import { getDateRange } from '../../utils/formatters.js';

Modal.setAppElement('#root');

const toBoundaryIso = (date, endOfDay = false) =>
  new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`).toISOString();

const TrackingManager = () => {
  const defaultRange = getDateRange(60);
  const { products, loading: productsLoading, error: productsError } = useGetProducts();
  const { refetch: requestBuyers, jobId, loading: requestingBuyers, error: requestError } = useBuyers();
  const { job, loadingStatus, error: statusError } = useJobStatus(jobId);
  const { templates, loading: templatesLoading, error: templatesError } = useGetTemplates();
  const { sendMessages, loading: sending } = useSendMessagesMassive();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [startDate, setStartDate] = useState(defaultRange.from);
  const [endDate, setEndDate] = useState(defaultRange.to);
  const navigate = useNavigate();

  const templatesWithId = useMemo(() => templates.map((template) => ({ ...template, id: String(template._id?.$oid || template._id) })), [templates]);
  const selectedProducts = useMemo(() => products.filter((product) => selectedItems.includes(product.id)), [products, selectedItems]);
  const buyersFound = job?.status === 'COMPLETED' && Array.isArray(job.buyers) ? job.buyers : [];
  const allSelected = products.length > 0 && selectedItems.length === products.length;

  useEffect(() => {
    if (job?.status === 'COMPLETED') toast.success(`${job.buyers?.length || 0} compradores encontrados.`);
  }, [job?.status, job?.buyers?.length]);

  const toggleProduct = (productId) => {
    setSelectedItems((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  };

  const toggleTemplate = (templateId) => {
    setSelectedTemplates((current) => current.includes(templateId) ? current.filter((id) => id !== templateId) : [...current, templateId]);
  };

  const handleFindBuyers = async () => {
    if (!selectedItems.length) return;
    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
      toast.warning('Revisá el rango de fechas seleccionado.');
      return;
    }

    setSubmitted(true);
    try {
      await requestBuyers(selectedItems, toBoundaryIso(startDate), toBoundaryIso(endDate, true));
    } catch {
      // El hook expone el detalle del error en la interfaz.
    }
  };

  const handleSend = async () => {
    const confirmation = await Swal.fire({
      title: '¿Iniciar la campaña?',
      html: `Se enviarán <strong>${selectedTemplates.length}</strong> mensaje(s) a <strong>${buyersFound.length}</strong> comprador(es).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, iniciar envío',
      cancelButtonText: 'Revisar',
      confirmButtonColor: '#3483fa',
      cancelButtonColor: '#64748b',
    });
    if (!confirmation.isConfirmed) return;

    try {
      await sendMessages({ templateIds: selectedTemplates, itemIds: selectedItems, jobId });
      navigate(`/app/massive-status/${jobId}`);
    } catch (sendError) {
      toast.error(sendError.message || 'No se pudo iniciar la campaña.');
    }
  };

  const filteredTemplates = templatesWithId.filter((template) => `${template.name} ${template.content}`.toLowerCase().includes(templateSearch.toLowerCase()));
  const canSend = buyersFound.length > 0 && selectedTemplates.length > 0 && !sending;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Audiencias de compradores"
        title="Campañas"
        description="Seleccioná publicaciones, encontrá compradores de un período y enviá mensajes con tus plantillas."
      />

      <ol className="campaign-steps" aria-label="Pasos para crear una campaña">
        <li className={selectedItems.length ? 'campaign-step campaign-step--done' : 'campaign-step campaign-step--active'}><span>{selectedItems.length ? <FiCheck /> : '1'}</span><div><strong>Publicaciones</strong><small>Elegí el origen</small></div></li>
        <li className={buyersFound.length ? 'campaign-step campaign-step--done' : submitted ? 'campaign-step campaign-step--active' : 'campaign-step'}><span>{buyersFound.length ? <FiCheck /> : '2'}</span><div><strong>Compradores</strong><small>Definí el período</small></div></li>
        <li className={selectedTemplates.length ? 'campaign-step campaign-step--done' : 'campaign-step'}><span>{selectedTemplates.length ? <FiCheck /> : '3'}</span><div><strong>Mensaje</strong><small>Seleccioná plantillas</small></div></li>
        <li className="campaign-step"><span>4</span><div><strong>Envío</strong><small>Confirmá la campaña</small></div></li>
      </ol>

      <div className="campaign-layout">
        <section className="panel campaign-builder">
          <div className="campaign-section-heading"><span>1</span><div><h2>Seleccioná publicaciones</h2><p>Podés elegir una, varias o todas.</p></div><button type="button" className="text-button" onClick={() => setSelectedItems(allSelected ? [] : products.map((product) => product.id))}>{allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}</button></div>
          <SearchField value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por título o ID…" label="Buscar publicación" />

          {productsLoading ? <div className="section-loader section-loader--compact"><Spinner loading size={32} color="#3483fa" /></div> : productsError ? <div className="form-alert form-alert--error">{productsError}</div> : (
            <PaginatedList
              items={products}
              searchTerm={searchTerm}
              itemsPerPage={6}
              filterBy={['title', 'id']}
              emptyState={<EmptyState icon={FiPackage} title="No encontramos publicaciones" />}
              renderItem={(product) => {
                const selected = selectedItems.includes(product.id);
                return (
                  <button type="button" className={`campaign-product ${selected ? 'campaign-product--selected' : ''}`} key={product.id} onClick={() => toggleProduct(product.id)}>
                    <span className="campaign-product__check">{selected && <FiCheck />}</span>
                    <span><strong>{product.title}</strong><small>{product.id}</small></span>
                  </button>
                );
              }}
            />
          )}

          <SelectedItemsList items={selectedProducts} onRemove={(productId) => toggleProduct(productId)} />

          <div className="campaign-divider" />
          <div className="campaign-section-heading"><span>2</span><div><h2>Definí el período</h2><p>Buscaremos compradores con ventas pagadas.</p></div></div>
          <div className="date-range-fields">
            <label className="form-field"><span>Desde</span><div className="input-with-icon"><FiCalendar /><input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></div></label>
            <label className="form-field"><span>Hasta</span><div className="input-with-icon"><FiCalendar /><input type="date" value={endDate} min={startDate} max={getDateRange(1).to} onChange={(event) => setEndDate(event.target.value)} /></div></label>
          </div>
          <button type="button" className="button button--primary button--full" onClick={handleFindBuyers} disabled={!selectedItems.length || requestingBuyers}>
            {requestingBuyers ? <><Spinner loading size={16} color="#fff" /> Preparando búsqueda…</> : <><FiSearch /> Buscar compradores</>}
          </button>
          {(requestError || statusError) && <div className="form-alert form-alert--error">{requestError || statusError}</div>}
        </section>

        <section className="campaign-side">
          <article className="panel">
            <div className="campaign-section-heading"><span>3</span><div><h2>Audiencia encontrada</h2><p>Resultados únicos del período.</p></div></div>
            <BuyersResults submitted={submitted} job={job} loadingStatus={loadingStatus} error={statusError} />
          </article>

          <article className="panel">
            <div className="campaign-section-heading"><span>4</span><div><h2>Mensaje de campaña</h2><p>Se respetará el orden seleccionado.</p></div></div>
            <button type="button" className="button button--secondary button--full" onClick={() => setTemplateModalOpen(true)}><FiFileText /> Explorar plantillas</button>
            {selectedTemplates.length ? (
              <div className="selected-template-list">{templatesWithId.filter((template) => selectedTemplates.includes(template.id)).map((template, index) => <div key={template.id}><span>{index + 1}</span><strong>{template.name}</strong><button type="button" onClick={() => toggleTemplate(template.id)} aria-label="Quitar"><FiX /></button></div>)}</div>
            ) : <div className="inline-empty inline-empty--small"><FiFileText /><span><strong>Sin mensajes seleccionados</strong><small>Elegí al menos una plantilla.</small></span></div>}
            <div className="campaign-audience-summary"><FiUsers /><span><strong>{buyersFound.length} destinatarios</strong><small>{selectedTemplates.length} mensaje{selectedTemplates.length === 1 ? '' : 's'} por comprador</small></span></div>
            <button type="button" className="button button--primary button--full button--large" disabled={!canSend} onClick={handleSend}>
              {sending ? <><Spinner loading size={16} color="#fff" /> Iniciando…</> : <><FiSend /> Iniciar campaña</>}
            </button>
            {!canSend && <p className="form-hint">Completá la audiencia y seleccioná una plantilla para habilitar el envío.</p>}
          </article>
        </section>
      </div>

      <Modal isOpen={templateModalOpen} onRequestClose={() => setTemplateModalOpen(false)} className="app-modal app-modal--large" overlayClassName="app-modal-overlay" contentLabel="Seleccionar plantillas">
        <div className="modal-shell">
          <div className="modal-shell__header"><div><span className="modal-shell__eyebrow"><FiSend /> Campaña</span><h2>Seleccionar mensajes</h2><p>Podés enviar más de una plantilla por comprador.</p></div><button type="button" className="icon-button" onClick={() => setTemplateModalOpen(false)} aria-label="Cerrar"><FiX /></button></div>
          <div className="modal-shell__body">
            <SearchField value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Buscar una plantilla…" label="Buscar plantilla" />
            {templatesLoading ? <div className="section-loader section-loader--compact"><Spinner loading size={32} color="#3483fa" /></div> : templatesError ? <div className="form-alert form-alert--error">{templatesError}</div> : !filteredTemplates.length ? <EmptyState icon={FiFileText} title="No hay plantillas disponibles" action={<Link to="/app/templates" className="button button--primary">Crear plantilla</Link>} /> : <div className="template-picker">{filteredTemplates.map((template) => { const selected = selectedTemplates.includes(template.id); return <button type="button" className={`template-option ${selected ? 'template-option--selected' : ''}`} key={template.id} onClick={() => toggleTemplate(template.id)}><span className="template-option__check">{selected && <FiCheck />}</span><span><strong>{template.name}</strong><small>{template.content}</small></span></button>; })}</div>}
          </div>
          <div className="modal-shell__footer"><span>{selectedTemplates.length} seleccionada{selectedTemplates.length === 1 ? '' : 's'}</span><div><button type="button" className="button button--primary" onClick={() => setTemplateModalOpen(false)}>Confirmar selección</button></div></div>
        </div>
      </Modal>
    </div>
  );
};

export default TrackingManager;
