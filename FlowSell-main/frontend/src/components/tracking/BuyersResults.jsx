import { FiAlertCircle, FiCheckCircle, FiClock, FiUsers } from 'react-icons/fi';

const BuyersResults = ({ submitted, job, loadingStatus, error }) => {
  if (error) return <div className="form-alert form-alert--error"><FiAlertCircle /> {error}</div>;

  if (!submitted) {
    return <div className="inline-empty"><FiUsers /><span><strong>La audiencia aparecerá acá</strong><small>Seleccioná publicaciones y un período para comenzar.</small></span></div>;
  }

  if (!job || !['COMPLETED', 'FAILED'].includes(job.status)) {
    const progress = Number(job?.progress?.percent || 0);
    return (
      <div className="processing-state">
        <span className="processing-state__icon"><FiClock /></span>
        <div><strong>Buscando compradores…</strong><small>Podés seguir trabajando mientras procesamos las ventas.</small></div>
        <div className="processing-progress"><span style={{ width: `${Math.max(progress, 8)}%` }} /></div>
        <p>{loadingStatus ? 'Actualizando resultados' : `${progress}% procesado`}</p>
      </div>
    );
  }

  if (job.status === 'FAILED') return <div className="form-alert form-alert--error"><FiAlertCircle /> La búsqueda no pudo completarse. Intentá nuevamente.</div>;

  const buyers = Array.isArray(job.buyers) ? job.buyers : [];
  if (!buyers.length) return <div className="inline-empty"><FiUsers /><span><strong>No encontramos compradores</strong><small>Probá ampliando el período o seleccionando más publicaciones.</small></span></div>;

  return (
    <div className="buyers-result">
      <div className="buyers-result__summary"><span><FiCheckCircle /></span><div><strong>{buyers.length} compradores</strong><small>Audiencia lista para contactar</small></div></div>
      <div className="data-table-wrap data-table-wrap--compact">
        <table className="data-table">
          <thead><tr><th>Comprador</th><th>Orden</th></tr></thead>
          <tbody>{buyers.slice(0, 20).map((buyer) => <tr key={`${buyer.buyerId}-${buyer.order_id}`}><td><strong>{buyer.nickname || 'Sin alias'}</strong><small>ID {buyer.buyerId}</small></td><td>#{buyer.order_id}</td></tr>)}</tbody>
        </table>
      </div>
      {buyers.length > 20 && <p className="table-note">Mostramos 20 de {buyers.length} resultados. Todos serán incluidos en la campaña.</p>}
    </div>
  );
};

export default BuyersResults;
