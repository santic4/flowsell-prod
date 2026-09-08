export class AppError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') { super(message); this.status = status; this.code = code; }
}
export const ensure = (condition, status, message, code) => { if (!condition) throw new AppError(status, message, code); };
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req,res,next)).catch(next);
// Deliberadamente no se registran URL, cookies, cuerpos, tokens ni errores del proveedor.
export const log = (event, fields = {}) => console.log(JSON.stringify({ time:new Date().toISOString(), event, ...fields }));
