import { CLIENT_ID } from "../config/config.js";
import { sendMessageAPI } from "../integrations/MELI/messages/messagesMeliAPI.js";
import { templatesServices } from "./templatesServices.js";

export const replyMessageServices = async (messageId, content, token) => {
  const response = await fetch('https://api.mercadolibre.com/answers', {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question_id: messageId, text: content }),
  });

  if (!response.ok) {
    const error = new Error('Mercado Libre no pudo procesar la respuesta.');
    error.status = response.status === 401 ? 401 : 502;
    throw error;
  }
  return await response.json();
}

async function uploadToMercadoLibre(fileUrl, accessToken) {
  // 1) Descargamos el blob desde Firebase
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen: ${response.statusText}`);
  }
  const blob = await response.blob();

  // 2) Preparamos el FormData para ML
  const form = new FormData();
  form.append('file', blob, 'attachment.jpg');  // el nombre es arbitrario

  // 3) Enviamos al endpoint de attachments
  const mlResponse = await fetch(
    'https://api.mercadolibre.com/messages/attachments',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form
    }
  );
  const mlData = await mlResponse.json();

  if (!mlResponse.ok) {
    throw new Error(`Error subiendo a ML: ${mlData.message}`);
  }

  // 4) Devolvemos el file_id
  return mlData.id;  
}


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
export const sendMessage = async (result, accessToken, user_id) => {
    try {
      if (!accessToken) {
        throw new Error('No se encontró el token de acceso. Asegúrate de estar autenticado.');
      }

      const sellerId = user_id;
      
      const PACK_ID = result.packId || result.orderId;
  
      const fileIdCache = {};
      const sentTemplateIds = new Set();

      for (const item of result.items) {
        const product = item.product;
      
        for (const template of product.templates) {
          const templateKey = String(template.templateId || `${template.name}:${template.content}`);
          if (sentTemplateIds.has(templateKey) || !template.content) continue;
          sentTemplateIds.add(templateKey);
          // 1) Convertir cada URL a file_id
          const attachmentsArray = [];
          
          if (Array.isArray(template.attachments) && template.attachments.length > 0) {
            for (const url of template.attachments) {
              const fileId = fileIdCache[url] || await uploadToMercadoLibre(url, accessToken);
              fileIdCache[url] = fileId;
              attachmentsArray.push({ id: fileId, type: 'image' });
            }
          }
        
          // 2) Construir el mensaje
          const message = {
            from: { user_id: sellerId },
            to:   { user_id: result.buyerId }, 
            text: template.content,
            attachments: attachmentsArray
          };
  
          await sendMessageAPI(PACK_ID, accessToken, message, CLIENT_ID, sellerId);
          await delay(1000);
        }
      }
  
      console.log('Todos los mensajes fueron enviados correctamente en el orden esperado.');
    } catch (error) {
      console.error('Error al procesar la notificación:', error.message);
      throw error;
    }
};
  

export const sendSecondMessage = async (orderId, secondMessagesSend, buyerId, accessToken, user_id) => {
  try {

    const sellerId = user_id;

    const fileIdCache = {};  
    for (const item of secondMessagesSend) {
    
      const attachmentsArray = [];

      for (const url of item.attachments) {
        const fileId = fileIdCache[url] || await uploadToMercadoLibre(url, accessToken);
        fileIdCache[url] = fileId;
        attachmentsArray.push({ id: fileId, type: 'image' });
      }

      // 2) Verificar y convertir sellerId y buyerId a string si es necesario
      const sellerIdStr = typeof sellerId === 'string' ? sellerId : String(sellerId);
      const buyerIdStr = typeof buyerId === 'string' ? buyerId : String(buyerId);

      // 3) Construir el mensaje
      const message = {  
        from: {
          user_id: sellerIdStr
        },
        to: {
          user_id: buyerIdStr
        },
        text: item.content,
        ...(attachmentsArray.length > 0 && { attachments: attachmentsArray })
      };
      await sendMessageAPI(orderId, accessToken, message, CLIENT_ID, sellerId);
      await delay(1000);
    }

    console.log('Todos los mensajes fueron enviados correctamente en el orden esperado.');
  } catch (error) {
    console.error('Error al procesar la notificación:', error.message);
    throw error;
  }
};

export async function sendMessageMassive(templateIds, buyers, token, userId, meliId) {
  // 1. Fetch templates from DB
  const templateDocuments = await templatesServices.getTemplatesByIDs(templateIds, userId);
  const templateMap = new Map(templateDocuments.map((template) => [String(template._id), template]));
  const templates = templateIds.map((templateId) => templateMap.get(String(templateId))).filter(Boolean);

  // 2. For each buyer, find matching templates
  const responses = [];
  const fileIdCache = {};

  for (const buyer of buyers) {
    for (const tpl of templates) {
      const attachments = [];
      for (const url of tpl.attachments || []) {
        const fileId = fileIdCache[url] || await uploadToMercadoLibre(url, token);
        fileIdCache[url] = fileId;
        attachments.push({ id: fileId, type: 'image' });
      }

      const message = {
        from: { user_id: meliId },
        to:   { user_id: buyer.buyerId }, 
        text: tpl.content,
        ...(attachments.length ? { attachments } : {}),
      };
      
      // Llama a tu API existente
      const data = await sendMessageAPI(
        buyer.order_id,
        token,
        message,
        CLIENT_ID,
        meliId
      );
      responses.push({ buyer: buyer.buyerId, data });

      await delay(1000);
    }
  }

  return responses;
}
