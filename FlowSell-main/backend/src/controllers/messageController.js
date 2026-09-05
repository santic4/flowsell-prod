import { fetchPendingMessages } from '../integrations/MELI/messages/messagesMeliAPI.js';
import { replyMessageServices } from '../services/messagesServices.js';
import { tokenServices } from '../services/tokenServices.js';

export const getMessages = async (req, res, next) => {
  try {
    const token = await tokenServices.getValidAccessToken(req.user);
    const messages = await fetchPendingMessages(token);
    res.json(messages);
  } catch (error) {
    console.error("Error al obtener mensajes:", error.message);
    next(error)
  }
};

export const replyMessage = async (req, res, next) => {
  const { messageId } = req.params;
  const { content } = req.body;

  try {
    if (!content || typeof content !== 'string' || content.length > 2000) {
      return res.status(400).json({ error: 'La respuesta debe tener entre 1 y 2000 caracteres.' });
    }
    const token = await tokenServices.getValidAccessToken(req.user);
    await replyMessageServices(messageId, content, token)

    res.json({ message: "Mensaje enviado exitosamente" });
  } catch (error) {
    console.error("Error al responder mensaje:", error.message);
    next(error)
  }
};
