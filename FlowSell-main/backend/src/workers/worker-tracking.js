import { Worker, QueueEvents } from 'bullmq';
import { REDIS_URL } from "../config/config.js";
import { trackingServices } from '../services/trackingServices.js';
import { updateJobInfra } from '../services/jobServicesInfra.js';
import { usersDAO } from '../DAO/usersDao.js';
import { tokenServices } from '../services/tokenServices.js';
import { jobsDAO } from '../DAO/jobsDAO.js';

const connection = { url: REDIS_URL };
export const trackingEvents = new QueueEvents('trackingQueue', { connection });

trackingEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`✔️ Job completado: ${jobId}`, returnvalue);
});
trackingEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Job falló: ${jobId} - ${failedReason}`);
});

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function logMemory(tag) {
  try {
    const mem = process.memoryUsage();
    console.log(`[MEM] ${tag} rss:${Math.round(mem.rss/1024/1024)}MB heapTotal:${Math.round(mem.heapTotal/1024/1024)}MB heapUsed:${Math.round(mem.heapUsed/1024/1024)}MB external:${Math.round(mem.external/1024/1024)}MB`);
  } catch (err) {
    console.warn('logMemory failed:', err?.message || err);
  }
}

/**
 * retryUpdateInfra - intenta llamar a updateJobInfra con reintentos exponenciales.
 * Se comporta similar a safePut previo: reintenta en errores "transitorios".
 *
 * - Si updateJobInfra lanza un error con .status 4xx (excepto 429), no reintenta.
 * - maxAttempts: número de intentos totales.
 */
async function retryUpdateInfra({ userId, jobId, buyers, partial = false, complete = false, offset = null, totalEstimate = null, processedSoFar = null, batchId = null }, maxAttempts = 5) {
  let attempt = 0;
  const baseBackoff = 500;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      console.log(`updateJobInfra attempt ${attempt} -> job ${jobId} (buyers ${Array.isArray(buyers) ? buyers.length : 'N/A'}, partial ${partial}, complete ${complete})`);
      const result = await updateJobInfra(userId, jobId, buyers, partial, complete, offset, totalEstimate, processedSoFar, batchId);
      console.log(`updateJobInfra OK (attempt ${attempt}) -> job ${jobId}`, { kind: result?.kind });
      return result;
    } catch (err) {
      const status = err?.status;
      console.warn(`updateJobInfra attempt ${attempt} failed for job ${jobId}. status:${status || 'N/A'} message:${err?.message || err}`);
      // Si error 4xx y no es 429, no reintentamos (error de cliente/validación)
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err;
      }
      if (attempt < maxAttempts) {
        const wait = baseBackoff * Math.pow(2, attempt);
        console.log(`retryUpdateInfra will retry in ${wait}ms (attempt ${attempt + 1})`);
        await sleep(wait);
      } else {
        console.error('retryUpdateInfra: max retries reached');
        throw new Error('retryUpdateInfra: max retries reached');
      }
    }
  }
  throw new Error('retryUpdateInfra: unreachable');
}

// --- Worker ---
export const trackingWorker = new Worker('trackingQueue', async (job) => {
  console.log("▶️ Procesando job", job.id, "data:", { ...job.data, accessToken: job.data?.accessToken ? '***' : undefined });

  const { userId, sellerId, itemIds, startDate, endDate } = job.data;

  let totalProcessed = 0;
  let lastTotalEstimate = null;
  let batchCount = 0;

  try {
    const user = await usersDAO.findOneUser({ meliId: sellerId });
    if (!user || String(user._id) !== String(userId)) {
      throw new Error('No se encontró la cuenta propietaria de la campaña.');
    }
    const accessToken = await tokenServices.getValidAccessToken(user);

    // consume generator batches
    for await (const { batch, offset, total } of trackingServices.getBuyersByItemIdsGenerator(
      sellerId, itemIds, accessToken, startDate, endDate,
      { limit: 50, batchSize: 200, delayMs: 300 } // podes ajustar batchSize/ delayMs desde aquí
    )) {
      batchCount++;
      // log de memoria cada 5 batches
      if (batchCount % 5 === 0) {
        logMemory(`job ${job.id} offset ${offset} batchCount ${batchCount}`);
      }

      // Payload para la infraestructura interna
      const payload = {
        userId,
        jobId: job.id,
        buyers: batch,
        partial: true,
        offset,
        totalEstimate: total,
        processedSoFar: totalProcessed + batch.length,
        batchId: null
      };

      try {
        // Llamada interna con reintentos
        await retryUpdateInfra({
          userId: payload.userId,
          jobId: payload.jobId,
          buyers: payload.buyers,
          partial: payload.partial,
          complete: false,
          offset: payload.offset,
          totalEstimate: payload.totalEstimate,
          processedSoFar: payload.processedSoFar,
          batchId: payload.batchId
        }, 5);
      } catch (err) {
        console.error(`updateJobInfra fallo irreparable para job ${job.id} en offset ${offset}:`, err?.message || err);
        // opcional: marcar job como failed (se propagará a QueueEvents.failed)
        throw err;
      }

      totalProcessed += batch.length;
      lastTotalEstimate = total;

      // actualizar progreso en BullMQ; si totalEstimate está disponible, calcula %
      try {
        if (total && total > 0) {
          const percent = Math.min(100, Math.round((offset / Math.max(total, 1)) * 100));
          await job.updateProgress({ processed: totalProcessed, offset, total, percent });
        } else {
          await job.updateProgress({ processed: totalProcessed, offset });
        }
      } catch (err) {
        console.warn('No pude actualizar progreso del job:', err?.message || err);
      }
    }

    // una vez terminado, avisar internamente que complete = true
    const finalPayload = {
      userId,
      jobId: job.id,
      buyers: [], // no hay nuevos buyers, sólo cierro el job
      partial: false,
      complete: true,
      totalProcessed
    };

    try {
      await retryUpdateInfra({
        userId: finalPayload.userId,
        jobId: finalPayload.jobId,
        buyers: finalPayload.buyers,
        partial: false,
        complete: true,
        offset: null,
        totalEstimate: null,
        processedSoFar: finalPayload.totalProcessed,
        batchId: null
      }, 5);
    } catch (err) {
      console.error('Fallo al notificar finalización del job internamente:', err?.message || err);
      throw err;
    }

    logMemory(`job ${job.id} finalizado. totalProcessed ${totalProcessed}`);

    console.log(`✔️ Job ${job.id} completado; ${totalProcessed} compradores guardados.`);

    // devuelve info para QueueEvents.completed
    return { saved: true, count: totalProcessed };

  } catch (err) {
    // captura global del job -> se propagará al events.failed
    console.error(`❌ Error procesando job ${job.id}:`, err?.message || err);
    await jobsDAO.updateJobStatus(String(job.id), 'FAILED', userId).catch(() => null);
    throw err;
  }

}, {
  connection,
  concurrency: 1,
  lockDuration: 10 * 60 * 1000 // 10 min lock; aumenta si los jobs suelen durar más
});
