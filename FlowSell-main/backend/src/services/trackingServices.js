import { jobsDAO } from "../DAO/jobsDAO.js";
import { trackingDAO } from "../DAO/trackingDao.js";

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

const dedupeBuyers = (buyers = []) => {
  const seen = new Map();
  for (const buyer of buyers) {
    const key = String(buyer.buyerId ?? buyer.order_id ?? '');
    if (key && !seen.has(key)) seen.set(key, buyer);
  }
  return Array.from(seen.values());
};

class TrackingServices {
  async *getBuyersByItemIdsGenerator(
    sellerId,
    itemIds = [],
    token,
    startDate,
    endDate,
    opts = {}
  ) {
    const limit = opts.limit || 50;        // parametro para la API de ML
    const batchSize = opts.batchSize || 200; // tamaño que emitimos como batch
    const delayMs = typeof opts.delayMs === 'number' ? opts.delayMs : 300;
    const maxAttempts = opts.maxAttempts || 5;
    const baseBackoff = opts.baseBackoff || 500;

    let offset = 0;
    let total = Infinity;
    let buffer = [];

    do {
      let res;
      let attempts = 0;
      while (attempts < maxAttempts) {
        try {
          res = await trackingDAO.fetchOrdersBySeller(
            sellerId,
            startDate,
            endDate,
            token,
            offset,
            limit
          );
          break;
        } catch (err) {
          attempts++;
          const wait = baseBackoff * Math.pow(2, attempts);
          console.warn(`fetchOrders attempt ${attempts} failed. retrying in ${wait}ms`, err?.message || err);
          await sleep(wait);
          // si es ultimo intento y falla, propaga el error
          if (attempts >= maxAttempts) throw err;
        }
      }

      const orders = res?.results || [];
      total = res?.paging?.total ?? (offset + orders.length);

      // extraer compradores relevantes
      for (const ord of orders) {
        if (ord.status !== 'paid') continue;
        for (const itemObj of ord.order_items || []) {
          if (itemIds.length === 0 || itemIds.includes(itemObj.item.id)) {
            buffer.push({
              buyerId: ord.buyer.id,
              nickname: ord.buyer.nickname,
              order_id: ord.id
            });
            break;
          }
        }
      }

      // si acumularon suficientes, emitimos batches
      while (buffer.length >= batchSize) {
        const batch = buffer.splice(0, batchSize);
        yield { batch, offset, total };
      }

      offset += limit;
      await sleep(delayMs);
    } while (offset < total);

    // Emitir lo que quede al final
    if (buffer.length > 0) {
      yield { batch: buffer.splice(0, buffer.length), offset, total };
    }
  }
  async saveBuyersResults(userId, jobId, buyers = [], options = {}) {
    const { partial = false, complete = false, offset = null, totalEstimate = null, processedSoFar = null, batchId = null } = options;

    try {
      // Normalizar buyers
      const buyersArr = Array.isArray(buyers) ? buyers : [];

      // Buscar job existente
      const normalizedUserId = String(userId);
      const existing = await jobsDAO.findOne({ jobId, userId: normalizedUserId });

      if (partial) {
        // Si no existe, creamos uno en IN_PROGRESS
        if (!existing) {
          const doc = {
            userId: normalizedUserId,
            jobId,
            status: "IN_PROGRESS",
            buyers: buyersArr,
            progress: {
              offset,
              totalEstimate,
              processedSoFar,
              lastBatchId: batchId,
              percent: totalEstimate ? Math.min(100, Math.round(((offset || 0) / totalEstimate) * 100)) : null,
              updatedAt: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const upserted = await jobsDAO.upsert({ jobId, userId: normalizedUserId }, doc);
          console.log("Job parcial creado:", upserted);
          return upserted;
        }

        // Si existe, hacemos merge + dedupe por order_id para evitar duplicados
        const existingBuyers = Array.isArray(existing.buyers) ? existing.buyers : [];
        const merged = [...existingBuyers, ...buyersArr];

        // dedupe simple por order_id (puedes cambiar a buyerId+order_id si querés)
        const deduped = dedupeBuyers(merged);

        // actualizar documento con nuevos buyers y progress
        const updateDoc = {
          userId: normalizedUserId,
          jobId,
          status: "IN_PROGRESS",
          buyers: deduped,
          progress: {
            offset,
            totalEstimate,
            processedSoFar,
            lastBatchId: batchId,
            percent: totalEstimate ? Math.min(100, Math.round(((offset || 0) / totalEstimate) * 100)) : null,
            updatedAt: new Date()
          },
          updatedAt: new Date()
        };

        const result = await jobsDAO.upsert({ jobId, userId: normalizedUserId }, updateDoc);
        console.log(`Job ${jobId} append parcial guardado. buyers totales: ${deduped.length}`);
        return result;
      }

      if (complete) {
        // Si vienen buyers en cierre, hacemos merge final (evitamos perder datos)
        let finalBuyers = buyersArr;
        if (existing && Array.isArray(existing.buyers)) {
          const merged = [...existing.buyers, ...buyersArr];
          finalBuyers = dedupeBuyers(merged);
        }

        const finalDoc = {
          userId: normalizedUserId,
          jobId,
          status: "COMPLETED",
          buyers: finalBuyers,
          progress: {
            offset,
            totalEstimate,
            processedSoFar,
            lastBatchId: batchId,
            percent: 100,
            updatedAt: new Date()
          },
          completedAt: new Date(),
          updatedAt: new Date()
        };

        const upserted = await jobsDAO.upsert({ jobId, userId: normalizedUserId }, finalDoc);
        console.log(`Job ${jobId} marcado como COMPLETED. buyers totales: ${finalBuyers.length}`);

        return upserted;
      }

      // Si no es partial ni complete: fallback: sobrescribir / upsert simple
      const doc = {
        userId: normalizedUserId,
        jobId,
        status: existing?.status || "IN_PROGRESS",
        buyers: buyersArr,
        updatedAt: new Date()
      };
      const result = await jobsDAO.upsert({ jobId, userId: normalizedUserId }, doc);
      return result;

    } catch (error) {
      console.error("Error en saveBuyersResults:", error);
      throw error;
    }
  }

  async setStatusMessagesMassive(jobId, status, userId = null) {
    try {
      const result = await jobsDAO.updateStatusMessagesMassive(jobId, status, userId);
      if (!result) throw new Error(`No se encontró el job ${jobId}.`);
      return result;
    } catch (error) {
      console.error("Error al actualizar statusMessagesMassive:", error);
      throw error;
    }
  }

  async setStatusMessagesMassiveCompleted(jobId, userId = null) {
    return this.setStatusMessagesMassive(jobId, 'COMPLETED', userId);
  }
}

export const trackingServices = new TrackingServices()
