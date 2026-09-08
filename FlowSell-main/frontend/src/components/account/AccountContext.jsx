import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {Navigate,useLocation,Link} from 'react-router-dom';
import {apiRequest} from '../../api/api.js';
const AccountContext=createContext(null);
const PublicContext=createContext(null);
export const useAccount=()=>useContext(AccountContext);
export const usePublicConfig=()=>useContext(PublicContext);
export function PublicConfigProvider({children}) {
  const [data,setData]=useState(null),[error,setError]=useState('');
  const reload=useCallback(()=>apiRequest('/api/public/config').then(setData).catch(e=>setError(e.message)),[]);
  useEffect(()=>{reload();},[reload]);
  return <PublicContext.Provider value={{...data,loading:!data&&!error,error,reload}}>{children}</PublicContext.Provider>;
}
export function AccountProvider({children}) {
  const [account,setAccount]=useState(null),[error,setError]=useState('');
  const location=useLocation();
  const reload=useCallback(async()=>{
    try{const data=await apiRequest('/api/account');setAccount(data);setError('');return data;}
    catch(e){if(e.status===401){window.location.assign('/login');return;}setError(e.message);}
  },[]);
  useEffect(()=>{
    reload();let timer;
    const update=()=>{clearTimeout(timer);timer=setTimeout(reload,500);};
    window.addEventListener('accountChanged',update);
    const poll=setInterval(()=>{if(!document.hidden)reload();},60000);
    return()=>{clearTimeout(timer);clearInterval(poll);window.removeEventListener('accountChanged',update);};
  },[reload]);
  if(!account)return <main className="app-loading-screen"><h1>Flow Sell</h1><p role="status">{error||'Preparando tu cuenta…'}</p>{error&&<button className="button button--primary" onClick={reload}>Reintentar</button>}</main>;
  const safe=['/app/account','/app/plans','/app/guide','/app/admin'];
  if((!account.consentCurrent||!account.legalReady||account.status==='disconnected')&&!safe.includes(location.pathname))return <Navigate to="/app/account" replace/>;
  return <AccountContext.Provider value={{account,reload}}>{children}</AccountContext.Provider>;
}
export function PlanGate({feature,children}) {
  const {account}=useAccount();
  if(account.plan[feature])return children;
  return <section className="panel fs-upgrade"><span className="fs-eyebrow">Tu próximo paso</span><h1>Esta herramienta está disponible desde Premium</h1><p>Tu plan Gratuito incluye plantillas, flujos automáticos y estadísticas de los últimos 7 días. Compará los planes para ampliar tu operación.</p><Link className="button button--primary" to="/app/plans">Ver planes</Link></section>;
}
