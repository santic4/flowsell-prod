import { Queue, Worker } from "bullmq";
import { processWebhookNotification } from "../services/webhookService.js";
import { checkExistingOrder, saveOrderServices } from "../services/paymentsServices.js";
import { sendMessage, sendMessageMassive, sendSecondMessage } from "../services/messagesServices.js";
import { deliveredService } from "../services/deliveredServices.js";
import { REACT_APP_HOST_REDIS, REACT_APP_PORT_REDIS, REDIS_URL } from "../config/config.js";
import { tokenServices } from "../services/tokenServices.js";
import { usersDAO } from "../DAO/usersDao.js";
import { trackingServices } from "../services/trackingServices.js";

const redisConnection = REACT_APP_HOST_REDIS
  ? { host: REACT_APP_HOST_REDIS, port: Number(REACT_APP_PORT_REDIS || 6379) }
  : { url: REDIS_URL };

const redisConnectionTracking = {
  url: REDIS_URL
};

// Crear la cola de trabajo para los webhooks
export const webhookQueue = new Queue("webhookQueue", { connection: redisConnection });
const delayedMessageQueue = new Queue("delayedMessageQueue", { connection: redisConnection });
export const trackingQueue = new Queue("trackingQueue", { connection: redisConnectionTracking });
export const massiveMessagesQueue = new Queue("massiveMessagesQueue", { connection: redisConnectionTracking });

// Worker para procesar las tareas principales
new Worker("webhookQueue", async (job) => {
    const { topic, user_id, resource } = job.data;
    
    console.log(`Procesando webhook en background: ${topic}, resorurse: ${resource}, user_id: ${user_id}`);

    try {
        const user = await usersDAO.findOneUser({ meliId: user_id });

        const accessToken = await tokenServices.getValidAccessToken(user);
        
        const result = await processWebhookNotification(topic, resource, accessToken, user._id);

        if (!result) {
            console.log('Webhook omitido: la orden no tiene publicaciones configuradas.');
            return { skipped: true };
        }

        const orderExists = await checkExistingOrder(result, user_id);

        if (orderExists) {
            console.log("Orden ya procesada, ignorando webhook.");
            return;
        }

        await sendMessage(result, accessToken, user_id);
        console.log("Mensaje enviado.");

        await saveOrderServices(result, user);

        try {
          await deliveredService(resource, accessToken);
          console.log("Entrega marcada como completada.");
        } catch (err) {
          console.error("⚠️ No se pudo marcar la entrega como completada:", err.message);
        }

        if (result.secondMessages?.length) {
          const delayAsign = result.secondMessageDelay || 24;
          await delayedMessageQueue.add(
            "sendSecondMessage",
            {
              orderId: result.orderId,
              secondMessagesSend: result.secondMessages,
              buyerId: result.buyerId,
              user_id,
            },
            {
              delay: delayAsign * 60 * 60 * 1000,
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: 1000,
              removeOnFail: 1000,
            }
          );
        }
      
        console.log("Orden guardada exitosamente.");
    } catch (error) {
        console.error("Error procesando el webhook en la cola:", error.message);
        throw error;
    }
}, { connection: redisConnection });

// Worker para procesar las tareas del delay messages
new Worker("delayedMessageQueue", async (job) => {
    const { orderId, user_id, secondMessagesSend, buyerId } = job.data;

    try {
      const user = await usersDAO.findOneUser({ meliId: user_id });
      if (!user) throw new Error('No se encontró la cuenta propietaria del mensaje diferido.');
      const accessToken = await tokenServices.getValidAccessToken(user);
  
      const message = await sendSecondMessage( orderId, secondMessagesSend, buyerId, accessToken, user_id);
  
      console.log("Mensaje retrasado enviado correctamente.",message);
    } catch (err) {
      console.error("❌ Error enviando mensaje retrasado:", err.message);
      throw err;
    }
  }, { connection: redisConnection });



new Worker(
  "massiveMessagesQueue",
  async (job) => {
    const { templateIds, buyers, userId, meliId, jobId } = job.data;
    console.log("📨 Procesando envío masivo de mensajes", jobId);

    try {
      const user = await usersDAO.findOneUser({ meliId });
      if (!user || String(user._id) !== String(userId)) {
        throw new Error('No se encontró la cuenta propietaria de la campaña.');
      }
      const token = await tokenServices.getValidAccessToken(user);

      const responses = await sendMessageMassive(templateIds, buyers, token, userId, meliId);
      
      console.log("✔️ Envío masivo completado para job massiveeee", jobId);

      const setStatus = await trackingServices.setStatusMessagesMassiveCompleted(jobId, userId);
      console.log(setStatus, 'setStatus en massiveMessagesQueue');

    } catch (err) {
      console.error("❌ Error en el worker de envío masivo:", err.message);
      await trackingServices.setStatusMessagesMassive(jobId, 'FAILED', userId).catch(() => null);
      throw err;
    }
  },
   {
    connection: redisConnectionTracking,
    concurrency: 1,     
    lockDuration: 120000, // 2 minutos de lock
  }
);
