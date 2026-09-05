const configuredHost = process.env.REACT_APP_HOST_HOOKS || '';

export const REACT_APP_HOST_HOOKS = configuredHost.replace(/\/$/, '');
