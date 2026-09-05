import { REACT_APP_HOST_HOOKS } from '../config/config.js';

export const apiUrl = (path) => `${REACT_APP_HOST_HOOKS}${path}`;

const readResponse = async (response) => {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
};

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });

  const payload = await readResponse(response);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `La solicitud falló (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const fetchTemplates = () => apiRequest('/api/templates');

export const createTemplate = (template) => apiRequest('/api/templates', {
  method: 'POST',
  body: JSON.stringify(template),
});

export const getUser = () => apiRequest('/api/users/me');
