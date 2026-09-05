import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from 'react-modal';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { FiEdit3, FiFileText, FiImage, FiPaperclip, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { apiRequest } from '../../api/api.js';
import useCreateTemplate from '../../hooks/useCreateTemplate.js';
import { useUpdateTemplate } from '../../hooks/useUpdateTemplate.js';
import PageHeader from '../common/PageHeader.jsx';
import SearchField from '../common/SearchField.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Spinner from '../spinner/Spinner.jsx';

Modal.setAppElement('#root');

const useFilePreviews = (files) => {
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const nextPreviews = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(nextPreviews);
    return () => nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [files]);

  return previews;
};

const AttachmentPreview = ({ images = [], onRemove }) => {
  if (!images.length) return null;
  return (
    <div className="attachment-preview">
      {images.map((image, index) => {
        const url = typeof image === 'string' ? image : image.url;
        const key = typeof image === 'string' ? image : `${image.name}-${index}`;
        return (
          <div className="attachment-preview__item" key={key}>
            <img src={url} alt="Vista previa del adjunto" />
            {onRemove && <button type="button" onClick={() => onRemove(image, index)} aria-label="Quitar imagen"><FiX /></button>}
          </div>
        );
      })}
    </div>
  );
};

const TemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', content: '', assignedPublications: [] });
  const [createImages, setCreateImages] = useState([]);
  const [createInputKey, setCreateInputKey] = useState(0);
  const [savingCreate, setSavingCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', content: '', assignedPublications: '' });
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [newEditImages, setNewEditImages] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const createTemplate = useCreateTemplate();
  const { updateTemplate } = useUpdateTemplate();
  const createPreviews = useFilePreviews(createImages);
  const editPreviews = useFilePreviews(newEditImages);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => templates.filter((template) =>
    `${template.name} ${template.content}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [searchTerm, templates]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSavingCreate(true);
    try {
      const created = await createTemplate(createForm, createImages);
      setTemplates((current) => [created, ...current]);
      setCreateForm({ name: '', content: '', assignedPublications: [] });
      setCreateImages([]);
      setCreateInputKey((key) => key + 1);
      toast.success('Plantilla creada y lista para asignar.');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSavingCreate(false);
    }
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setEditForm({
      name: template.name || '',
      content: template.content || '',
      assignedPublications: (template.assignedPublications || []).join(', '),
    });
    setExistingImages(template.attachments || []);
    setRemovedImages([]);
    setNewEditImages([]);
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditingTemplate(null);
    setExistingImages([]);
    setRemovedImages([]);
    setNewEditImages([]);
  };

  const removeExistingImage = (url) => {
    setExistingImages((images) => images.filter((image) => image !== url));
    setRemovedImages((images) => [...images, url]);
  };

  const removeNewImage = (_, index) => {
    setNewEditImages((images) => images.filter((__, imageIndex) => imageIndex !== index));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    try {
      const updated = await updateTemplate(editingTemplate._id, editForm, removedImages, newEditImages);
      setTemplates((current) => current.map((template) => template._id === updated._id ? updated : template));
      toast.success('Plantilla actualizada correctamente.');
      setEditingTemplate(null);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (template) => {
    const result = await Swal.fire({
      title: '¿Eliminar la plantilla?',
      text: `“${template.name}” se eliminará de forma permanente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e5484d',
      cancelButtonColor: '#64748b',
    });
    if (!result.isConfirmed) return;

    try {
      await apiRequest(`/api/templates/${template._id}`, { method: 'DELETE' });
      setTemplates((current) => current.filter((item) => item._id !== template._id));
      toast.success('Plantilla eliminada.');
    } catch (requestError) {
      toast.error(requestError.message);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Biblioteca de contenido"
        title="Plantillas"
        description="Creá mensajes reutilizables para automatizaciones y campañas. Cada mensaje admite hasta 350 caracteres."
      />

      <div className="template-layout">
        <section className="panel template-library">
          <div className="panel__header">
            <div><span className="panel__eyebrow">Tus mensajes</span><h2>Biblioteca</h2></div>
            <span className="count-badge">{templates.length}</span>
          </div>
          <SearchField value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nombre o contenido…" label="Buscar plantilla" />

          {loading ? (
            <div className="section-loader"><Spinner loading size={36} color="#3483fa" /><p>Cargando plantillas…</p></div>
          ) : error ? (
            <EmptyState icon={FiFileText} title="No pudimos cargar las plantillas" description={error} action={<button type="button" className="button button--primary" onClick={loadTemplates}>Reintentar</button>} />
          ) : !filteredTemplates.length ? (
            <EmptyState icon={FiFileText} title={searchTerm ? 'No hay coincidencias' : 'Tu biblioteca está vacía'} description={searchTerm ? 'Probá con otra búsqueda.' : 'Creá la primera plantilla desde el formulario.'} />
          ) : (
            <div className="template-card-list">
              {filteredTemplates.map((template) => (
                <article className="template-card" key={template._id}>
                  <div className="template-card__top">
                    <span className="template-card__icon"><FiFileText /></span>
                    <div><h3>{template.name}</h3><small>{template.assignedPublications?.length || 0} publicaciones asignadas</small></div>
                    <div className="template-card__actions">
                      <button type="button" className="icon-button" onClick={() => openEdit(template)} aria-label={`Editar ${template.name}`} title="Editar"><FiEdit3 /></button>
                      <button type="button" className="icon-button icon-button--danger" onClick={() => handleDelete(template)} aria-label={`Eliminar ${template.name}`} title="Eliminar"><FiTrash2 /></button>
                    </div>
                  </div>
                  <p className="template-card__content">{template.content}</p>
                  <div className="template-card__footer">
                    <span>{template.content?.length || 0}/350 caracteres</span>
                    {template.attachments?.length > 0 && <span><FiPaperclip /> {template.attachments.length} adjunto{template.attachments.length === 1 ? '' : 's'}</span>}
                  </div>
                  {template.attachments?.length > 0 && <AttachmentPreview images={template.attachments.slice(0, 4)} />}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="panel template-composer">
          <div className="panel__header">
            <div><span className="panel__eyebrow">Nuevo contenido</span><h2>Crear plantilla</h2></div>
            <span className="panel-icon"><FiPlus /></span>
          </div>
          <form className="form-stack" onSubmit={handleCreate}>
            <label className="form-field">
              <span>Nombre de la plantilla</span>
              <input name="name" value={createForm.name} onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))} placeholder="Ej.: Gracias por tu compra" maxLength={70} required />
              <small>Usá un nombre que te ayude a identificarla rápido.</small>
            </label>
            <label className="form-field">
              <span>Mensaje</span>
              <textarea name="content" value={createForm.content} onChange={(event) => setCreateForm((form) => ({ ...form, content: event.target.value }))} placeholder="Escribí el mensaje que recibirá tu comprador…" maxLength={350} rows={8} required />
              <small className={createForm.content.length > 320 ? 'character-count character-count--warning' : 'character-count'}>{createForm.content.length}/350</small>
            </label>
            <label className="file-drop">
              <FiImage />
              <span><strong>Adjuntar imágenes</strong><small>PNG, JPG o WEBP · hasta 20 archivos</small></span>
              <input key={createInputKey} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setCreateImages(Array.from(event.target.files || []).slice(0, 20))} />
            </label>
            <AttachmentPreview images={createPreviews} onRemove={(_, index) => setCreateImages((images) => images.filter((__, imageIndex) => imageIndex !== index))} />
            <button type="submit" className="button button--primary button--full" disabled={savingCreate}>
              {savingCreate ? <><Spinner loading size={16} color="#fff" /> Creando…</> : <><FiPlus /> Crear plantilla</>}
            </button>
          </form>
        </aside>
      </div>

      <Modal isOpen={Boolean(editingTemplate)} onRequestClose={closeEdit} className="app-modal" overlayClassName="app-modal-overlay" contentLabel="Editar plantilla">
        {editingTemplate && (
          <form className="modal-shell" onSubmit={handleUpdate}>
            <div className="modal-shell__header">
              <div><span className="modal-shell__eyebrow"><FiEdit3 /> Edición</span><h2>Editar plantilla</h2><p>Los cambios se aplicarán a todas sus asignaciones.</p></div>
              <button type="button" className="icon-button" onClick={closeEdit} aria-label="Cerrar"><FiX /></button>
            </div>
            <div className="modal-shell__body form-stack">
              <label className="form-field"><span>Nombre</span><input value={editForm.name} onChange={(event) => setEditForm((form) => ({ ...form, name: event.target.value }))} maxLength={70} required /></label>
              <label className="form-field"><span>Mensaje</span><textarea value={editForm.content} onChange={(event) => setEditForm((form) => ({ ...form, content: event.target.value }))} maxLength={350} rows={7} required /><small className="character-count">{editForm.content.length}/350</small></label>
              {existingImages.length > 0 && <div className="form-field"><span>Imágenes actuales</span><AttachmentPreview images={existingImages} onRemove={(image) => removeExistingImage(image)} /></div>}
              <label className="file-drop"><FiImage /><span><strong>Agregar imágenes</strong><small>Se sumarán a los adjuntos actuales</small></span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setNewEditImages(Array.from(event.target.files || []).slice(0, 20))} /></label>
              <AttachmentPreview images={editPreviews} onRemove={removeNewImage} />
            </div>
            <div className="modal-shell__footer"><span>{existingImages.length + newEditImages.length} imágenes en total</span><div><button type="button" className="button button--ghost" onClick={closeEdit}>Cancelar</button><button type="submit" className="button button--primary" disabled={savingEdit}>{savingEdit ? <><Spinner loading size={16} color="#fff" /> Guardando…</> : 'Guardar cambios'}</button></div></div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default TemplateManager;
