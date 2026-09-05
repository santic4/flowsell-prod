import { webhookQueue } from "../utils/queue.js";

export const webhookPayment = async (req, res) => {
    try {
        const { topic, resource, user_id } = req.body;
    
        if (!topic || !resource) {
          return res.status(400).json({ error: 'Solicitud inválida, faltan datos requeridos.' });
        }

        if (topic !== "orders_v2"){
          return res.status(200).json({ message: 'Webhook omitido: topic no es orders_v2' });
        }

        await webhookQueue.add(
          "processWebhook",
          { topic, resource, user_id },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 1000,
            removeOnFail: 1000,
          }
        );

        res.status(200).json({ message: "Webhook recibido y en cola para procesamiento." });
      } catch (error) {
        console.error('Error al procesar el webhook:', error.message);
        res.status(500).json({ error: 'Error al procesar la notificación' });
      }
  };
