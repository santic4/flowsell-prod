import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiFileText, FiLayers, FiX } from 'react-icons/fi';
import { apiRequest } from '../../api/api.js';
import Spinner from '../spinner/Spinner.jsx';
import SearchField from '../common/SearchField.jsx';
import EmptyState from '../common/EmptyState.jsx';

const getVariationLabel = (variation) => {
  if (variation?.attribute_combinations?.length) {
    return variation.attribute_combinations.map((attribute) => `${attribute.name}: ${attribute.value_name}`).join(' · ');
  }
  return variation?.name || `Variante ${variation?.id}`;
};

const TemplateModal = ({ product, closeModal, onAssigned, allowEmpty = false }) => {
  const variations = useMemo(() => product?.variations || [], [product]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState(variations[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedVariation(variations[0]?.id || '');
  }, [product.id, variations]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      apiRequest('/api/templates'),
      apiRequest(`/api/products/template/${product.id}`).catch((requestError) => {
        if (requestError.status === 404) return { templates: [], variations: [] };
        throw requestError;
      }),
    ])
      .then(([availableTemplates, assignedData]) => {
        if (!active) return;
        setTemplates(Array.isArray(availableTemplates) ? availableTemplates : []);
        if (selectedVariation) {
          const variation = assignedData.variations?.find((item) => String(item.id) === String(selectedVariation));
          setSelectedTemplates((variation?.templates || []).map((item) => String(item.templateId?._id || item.templateId)));
        } else {
          setSelectedTemplates((assignedData.templates || []).map((item) => String(item.templateId?._id || item.templateId)));
        }
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [product.id, selectedVariation]);

  const filteredTemplates = templates.filter((template) =>
    `${template.name} ${template.content}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTemplate = (templateId) => {
    setSelectedTemplates((selected) => selected.includes(templateId)
      ? selected.filter((id) => id !== templateId)
      : [...selected, templateId]);
  };

  const handleAssignTemplates = async () => {
    if (!allowEmpty && !selectedTemplates.length) {
      setError('Seleccioná al menos una plantilla para activar el flujo.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const selectedVariationObject = variations.find((variation) => String(variation.id) === String(selectedVariation));
      await apiRequest(`/api/products/${product.id}/assign-templates-modal`, {
        method: 'POST',
        body: JSON.stringify({
          templateIds: selectedTemplates,
          productAsign: product.title,
          variationId: selectedVariation || null,
          variationName: selectedVariationObject ? getVariationLabel(selectedVariationObject) : null,
        }),
      });
      onAssigned?.();
      closeModal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-shell">
      <div className="modal-shell__header">
        <div>
          <span className="modal-shell__eyebrow"><FiLayers /> Flujo posventa</span>
          <h2>Configurar mensajes automáticos</h2>
          <p>{product.title}</p>
        </div>
        <button type="button" className="icon-button" onClick={closeModal} aria-label="Cerrar"><FiX /></button>
      </div>

      <div className="modal-shell__body">
        {variations.length > 0 && (
          <label className="form-field">
            <span>Variante de la publicación</span>
            <select value={selectedVariation} onChange={(event) => setSelectedVariation(event.target.value)}>
              {variations.map((variation) => <option key={variation.id} value={variation.id}>{getVariationLabel(variation)}</option>)}
            </select>
            <small>La configuración se guarda de forma independiente para cada variante.</small>
          </label>
        )}

        <SearchField value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar una plantilla…" label="Buscar plantilla" />

        {loading ? (
          <div className="section-loader section-loader--compact"><Spinner loading size={32} color="#3483fa" /><p>Cargando plantillas…</p></div>
        ) : !templates.length ? (
          <EmptyState icon={FiFileText} title="Todavía no creaste plantillas" description="Cerrá esta ventana y creá tu primer mensaje desde la sección Plantillas." />
        ) : (
          <div className="template-picker">
            {filteredTemplates.map((template) => {
              const id = String(template._id);
              const selected = selectedTemplates.includes(id);
              return (
                <button type="button" className={`template-option ${selected ? 'template-option--selected' : ''}`} key={id} onClick={() => toggleTemplate(id)}>
                  <span className="template-option__check">{selected && <FiCheck />}</span>
                  <span><strong>{template.name}</strong><small>{template.content}</small></span>
                  {template.attachments?.length > 0 && <b>{template.attachments.length} img.</b>}
                </button>
              );
            })}
          </div>
        )}

        {error && <div className="form-alert form-alert--error">{error}</div>}
      </div>

      <div className="modal-shell__footer">
        <span>{selectedTemplates.length} plantilla{selectedTemplates.length === 1 ? '' : 's'} seleccionada{selectedTemplates.length === 1 ? '' : 's'}</span>
        <div>
          <button type="button" className="button button--ghost" onClick={closeModal}>Cancelar</button>
          <button type="button" className="button button--primary" onClick={handleAssignTemplates} disabled={saving || loading}>
            {saving ? <><Spinner loading size={16} color="#fff" /> Guardando…</> : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
