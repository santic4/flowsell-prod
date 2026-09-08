import { Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiClock, FiRefreshCw, FiSend, FiUsers, FiXCircle } from 'react-icons/fi';
import { useMassiveMessagesStatus } from '../../hooks/useMassiveMessagesStatus.js';
import PageHeader from '../common/PageHeader.jsx';
import Spinner from '../spinner/Spinner.jsx';

const MassiveMessagesStatus = ({ jobId }) => {
  const { loading, status, job, error } = useMassiveMessagesStatus(jobId);
  const currentStatus = status || 'PROCESSING';
  const completed = currentStatus === 'COMPLETED';
  const failed = currentStatus === 'FAILED';
  const recipients = job?.buyers?.length || 0;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Procesamiento en segundo plano"
        title="Estado de la campaña"
        description={`Identificador de operación: ${jobId}`}
        actions={<Link to="/app/campaigns" className="button button--secondary"><FiArrowLeft /> Volver a campañas</Link>}
      />

      <section className={`campaign-status-card ${completed ? 'campaign-status-card--success' : failed ? 'campaign-status-card--error' : ''}`}>
        <div className="campaign-status-card__icon">{completed ? <FiCheck /> : failed ? <FiXCircle /> : <FiSend />}</div>
        <div className="campaign-status-card__copy">
          <span>{completed ? 'Campaña completada' : failed ? 'El envío se interrumpió' : 'Campaña en progreso'}</span>
          <h1>{completed ? 'Los mensajes fueron procesados' : failed ? 'No pudimos completar todos los envíos' : 'Estamos enviando tus mensajes'}</h1>
          <p>{completed ? `Mercado Libre aceptó los envíos para ${recipients} comprador${recipients === 1 ? '' : 'es'}. Esto no confirma lectura.` : failed ? 'Revisá la actividad de Mi cuenta y Mercado Libre antes de repetir una campaña, para evitar duplicados.' : 'Este proceso puede demorar unos minutos. La pantalla se actualiza automáticamente.'}</p>
        </div>
        {loading && <Spinner loading size={42} color="#3483fa" />}
      </section>

      {error && <div className="form-alert form-alert--error"><FiXCircle /> {error}<button type="button" className="text-button" onClick={() => window.location.reload()}><FiRefreshCw /> Reintentar</button></div>}

      <section className="panel delivery-progress">
        <div className="panel__header"><div><span className="panel__eyebrow">Progreso</span><h2>Procesamiento de campaña</h2></div><span className={`status-badge ${completed ? 'status-badge--success' : failed ? 'status-badge--danger' : 'status-badge--info'}`}>{completed ? 'Completada' : failed ? 'Fallida' : 'Procesando'}</span></div>
        <div className="delivery-timeline">
          <div className="delivery-step delivery-step--done"><span><FiCheck /></span><div><strong>Audiencia preparada</strong><small>{recipients} compradores incluidos</small></div></div>
          <div className={`delivery-step ${completed ? 'delivery-step--done' : failed ? 'delivery-step--failed' : 'delivery-step--active'}`}><span>{completed ? <FiCheck /> : failed ? <FiXCircle /> : <FiClock />}</span><div><strong>Envío de mensajes</strong><small>{completed ? 'Todos los mensajes fueron procesados' : failed ? 'Se produjo un error durante el envío' : 'Procesando la cola de mensajes'}</small></div></div>
          <div className={`delivery-step ${completed ? 'delivery-step--done' : ''}`}><span>{completed ? <FiCheck /> : '3'}</span><div><strong>Campaña finalizada</strong><small>{completed ? 'La operación terminó correctamente' : 'Esperando la finalización del envío'}</small></div></div>
        </div>
      </section>

      <section className="metrics-grid metrics-grid--two">
        <article className="metric-card"><div className="metric-card__icon metric-card__icon--blue"><FiUsers /></div><div><span>Destinatarios</span><strong>{recipients}</strong><small>Compradores de la campaña</small></div></article>
        <article className="metric-card"><div className="metric-card__icon metric-card__icon--green"><FiSend /></div><div><span>Estado</span><strong>{completed ? 'Enviado' : failed ? 'Con error' : 'En curso'}</strong><small>Actualización automática</small></div></article>
      </section>
    </div>
  );
};

export default MassiveMessagesStatus;
