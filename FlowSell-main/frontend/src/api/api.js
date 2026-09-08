import { REACT_APP_HOST_HOOKS } from '../config/config.js';

export const apiUrl = (path) => `${REACT_APP_HOST_HOOKS}${path}`;
let csrfToken=null;
let csrfPending=null;
async function getCsrf() {
  if(csrfToken)return csrfToken;
  if(!csrfPending)csrfPending=fetch(apiUrl('/api/auth/csrf'),{credentials:'include'}).then(async r=>{
    if(!r.ok)throw new Error('No pudimos verificar tu sesión. Recargá la página.');
    csrfToken=(await r.json()).csrfToken;return csrfToken;
  }).finally(()=>{csrfPending=null;});
  return csrfPending;
}

const readResponse = async (response) => {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
};

export const apiRequest = async (path, options = {}) => {
  const mutation=!['GET','HEAD','OPTIONS'].includes((options.method||'GET').toUpperCase());
  const token=mutation?await getCsrf():null;
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
      ...(token?{'X-CSRF-Token':token}:{}),
    },
  });

  const payload = await readResponse(response);

  if (!response.ok) {
    if(response.status===401||payload?.code==='CSRF')csrfToken=null;
    const message = payload?.error || payload?.message || `La solicitud falló (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if(mutation)window.dispatchEvent(new Event('accountChanged'));
  return payload;
};

export const fetchTemplates = () => apiRequest('/api/templates');

export const createTemplate = (template) => apiRequest('/api/templates', {
  method: 'POST',
  body: JSON.stringify(template),
});

export const getUser = () => apiRequest('/api/users/me');
