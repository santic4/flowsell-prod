import { trackingServices } from "./trackingServices.js";

export async function updateJobInfra(
  userId,
  jobId,
  buyers,
  partial,
  complete,
  offset,
  totalEstimate,
  processedSoFar,
  batchId
) {
  // Helper para crear errores con código HTTP (útil para el worker si quiere mapear)
  const makeError = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
  };

  if (!jobId) {
    throw makeError(400, 'jobId requerido');
  }

  try {
    const options = {
      partial: !!partial,
      complete: !!complete,
      offset: offset ?? null,
      totalEstimate: totalEstimate ?? null,
      processedSoFar: processedSoFar ?? null,
      batchId: batchId ?? null
    };

    // Guarda resultados: puede lanzar si falla internamente
    await trackingServices.saveBuyersResults(userId, jobId, buyers, options);

    // Devuelve un objeto que el caller (worker) pueda interpretar sin HTTP
    if (options.partial) {
      return {
        success: true,
        kind: 'partial',
        message: 'Batch parcial recibido',
        jobId,
        processedSoFar: options.processedSoFar
      };
    }

    if (options.complete) {
      return {
        success: true,
        kind: 'complete',
        message: 'Job marcado como completo',
        jobId
      };
    }

    return {
      success: true,
      kind: 'update',
      message: 'Job actualizado',
      jobId
    };
  } catch (error) {
    // Log claro para debugging
    console.error('Error en updateJobInfra:', error?.message || error, { jobId, userId, batchId });

    // Si el error ya tiene status (p. ej. saveBuyersResults lanzó uno), lo reutilizamos
    if (error && typeof error.status === 'number') {
      throw error;
    }

    // Sino, lanzamos uno con 500 para que el caller sepa que fue un error de servidor
    const err = new Error('updateJobInfra: error al guardar resultados');
    err.status = 500;
    // adjuntamos el original para debugging si querés inspeccionar la stack
    err.original = error;
    throw err;
  }
}