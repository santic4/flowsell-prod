import {useState} from 'react';
import {Link} from 'react-router-dom';
import {FiCheck,FiArrowRight} from 'react-icons/fi';
import {useAccount,usePublicConfig} from './AccountContext.jsx';
import {apiRequest} from '../../api/api.js';
export function PlanCards({signedIn=false,current,onChoose,busy}) {
  const data=usePublicConfig();
  if(data.loading)return <p role="status">Cargando planes…</p>;
  if(data.error)return <p role="alert">No pudimos cargar los planes. <button className="text-button" onClick={data.reload}>Reintentar</button></p>;
  return <div className="fs-plans-grid">{data.plans.map(plan=><article key={plan.id} className={'fs-plan '+(plan.id==='premium'?'fs-plan--featured':'')}>
    <div className="fs-plan-top"><h3>{plan.name}</h3>{plan.id==='premium'&&<span>Para crecer</span>}{current===plan.id&&<span>Tu plan</span>}</div>
    <div className="fs-price">{plan.price===0?'$0':<><small>USD</small> {plan.price}</>}<span>/ mes</span></div>
    <p>{plan.id==='free'?'Probá una operación más simple.':plan.id==='premium'?'Automatizá tu trabajo de todos los días.':'Más capacidad para una operación en expansión.'}</p>
    <ul>{[
      plan.flows+' publicaciones con flujos activos',plan.templates+' plantillas',
      plan.messages.toLocaleString('es-AR')+' intentos de mensaje por mes',
      Math.round(plan.storageBytes/1024/1024)+' MB de imágenes privadas',
      'Estadísticas: últimos '+plan.statisticsDays+' días',
      plan.export?'Exportación CSV de ventas':'Consulta de ventas en el panel',
      plan.delayed?'Mensajes diferidos de 1 a 72 horas':'Mensajes iniciales automáticos',
      plan.campaigns?plan.campaigns+' campañas/mes · hasta '+plan.recipients+' compradores cada una':'Guía y soporte por WhatsApp',
    ].map(text=><li key={text}><FiCheck/><span>{text}</span></li>)}</ul>
    {signedIn?<button className={'button button--full '+(plan.id==='premium'?'button--primary':'button--secondary')} disabled={busy||current===plan.id} onClick={()=>onChoose(plan.id)}>{current===plan.id?'Plan actual':'Solicitar '+plan.name}<FiArrowRight/></button>:<a className={'button button--full '+(plan.id==='premium'?'button--primary':'button--secondary')} href="#ingresar">Ingresar y elegir<FiArrowRight/></a>}
  </article>)}</div>;
}
export default function Plans(){
  const {account}=useAccount(),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState('');
  const choose=async plan=>{setBusy(true);setError('');setResult(null);try{setResult(await apiRequest('/api/account/plan-request',{method:'POST',body:JSON.stringify({plan})}));}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <div className="page-stack"><header><span className="fs-eyebrow">A tu ritmo</span><h1>Mi plan</h1><p>Actualmente tenés {account.plan.name}{account.planExpiresAt?' hasta el '+new Date(account.planExpiresAt).toLocaleDateString('es-AR'):''}. Elegí la capacidad que necesitás.</p></header>
    {error&&<p className="form-alert form-alert--error" role="alert">{error}</p>}
    {result&&<section className="panel fs-success"><h2>Solicitud registrada</h2><p>Referencia: {result.requestId}. Coordiná las condiciones y el pago con soporte. Tu plan cambia cuando confirmamos la contratación.</p><a className="button button--primary" href={result.whatsappUrl} target="_blank" rel="noreferrer">Continuar por WhatsApp</a></section>}
    <PlanCards signedIn current={account.plan.id} onChoose={choose} busy={busy}/>
    <section className="panel fs-prose"><h2>Condiciones claras</h2><p>Los precios son mensuales en USD. Antes de pagar te confirmamos por escrito el importe final, moneda de cobro, impuestos que correspondan y vigencia. Flow Sell no cobra ni renueva planes automáticamente dentro de la app.</p><p>Los cupos mensuales se renuevan el día 1 a las 00:00 UTC. Cada intento de enviar una plantilla a un comprador consume un mensaje; se cuentan también intentos fallidos para controlar el uso del servicio. Un cambio de plan no reinicia los contadores. Las imágenes también tienen cupos de carga y transferencia: 30 cargas / 250 MB por mes en Gratuito, 500 / 5.000 MB en Premium y 1.500 / 20.000 MB en Plus.</p><p>Al vencer o reducir un plan, conservás las configuraciones. Se ejecutan los flujos habilitados más antiguos hasta el nuevo límite; el resto queda fuera de ejecución. No se reenvían mensajes omitidos por falta de cupo. Las campañas y diferidos se detienen si dejan de estar incluidos.</p><Link to="/terms">Leer Términos y Condiciones</Link></section>
  </div>;
}
