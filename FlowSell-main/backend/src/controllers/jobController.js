import { trackingServices } from "../services/trackingServices.js";

export const updateJobController = async (req, res, next) => {
  // aceptamos payload parcial:
  // { userId, jobId, buyers, partial, complete, offset, totalEstimate, processedSoFar, batchId }
  const { jobId, buyers, partial, complete, offset, totalEstimate, processedSoFar, batchId } = req.body;
  const userId = String(req.user._id);

  if (!jobId) {
    return res.status(400).json({ error: "jobId requerido" });
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

    await trackingServices.saveBuyersResults(userId, jobId, buyers, options);

    if (options.partial) {
      // devolver algo informativo para el worker
      return res.status(200).json({ message: "Batch parcial recibido", jobId, processedSoFar });
    }

    if (options.complete) {
      return res.status(200).json({ message: "Job marcado como completo", jobId });
    }

    return res.status(200).json({ message: "Job actualizado", jobId });
  } catch (error) {
    console.error("Error en updateJobController:", error);
    next(error);
  }
};
