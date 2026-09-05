import fetch from 'node-fetch';
import { Template } from '../models/Template.js';
import { Product } from '../models/Product.js';

/**
 * Procesa una notificación del webhook de Mercado Libre.
 * @param {string} topic - Tópico de la notificación (e.g., "orders_v2").
 * @param {string} resource - URL del recurso asociado a la notificación.
 * @returns {object} - Datos procesados del recurso.
 */

export const processWebhookNotification = async (topic, resource, accessToken, ownerId) => {
  try {

    const orderId = resource.split('/').pop();

    if(!orderId){
      throw new Error('No existe el orderId.')
    }

    const orderDetails = await fetchOrderDetails(orderId, accessToken);

    let allSecondMessages = [];
    const delayCandidates = [];
    const secondTemplateIds = new Set();

    const itemsWithProductDetails = await Promise.all(orderDetails.order_items.map(async (item) => {

      const product = await Product.findOne({ id: item.item.id, owner: ownerId });
 
      if (!product) {
        return null;
      }

      let templatesWithContent = [];

      // Buscar variaciones si existen
      if (item.item.variation_id && Array.isArray(product.variations)) {
        const variation = product.variations.find(v => v.id === String(item.item.variation_id));
        
        if (variation && Array.isArray(variation.templates)) {
          templatesWithContent = await Promise.all(
            variation.templates.map(async tpl => {
              const tplDoc = await Template.findOne({ _id: tpl.templateId, owner: ownerId });
              return {
                templateId: String(tpl.templateId),
                name: tpl.name,
                content: tplDoc?.content || null,
                attachments: tplDoc?.attachments || [],
              };
            })
          );
        }
      }

      // Si no hay variaciones, usar plantillas globales
      if (templatesWithContent.length === 0 && Array.isArray(product.templates)) {
        templatesWithContent = await Promise.all(product.templates.map(async (template) => {
          const templateDetails = await Template.findOne({ _id: template.templateId, owner: ownerId });
  
          return {
            templateId: String(template.templateId),
            name: template.name,
            content: templateDetails?.content || null,
            attachments: templateDetails?.attachments || [],
          };
        }));
      }

      // Procesar secondMessages si existen

      if (Array.isArray(product.secondMessages) && product.secondMessages.length > 0) {
        delayCandidates.push(Number(product.secondMessageDelay) || 24);

        for (const sm of product.secondMessages) {

          const templateIdStr = String(sm.templateId);

          if (!secondTemplateIds.has(templateIdStr)) {
            const tplDoc = await Template.findOne({ _id: templateIdStr, owner: ownerId });
            allSecondMessages.push({
              templateId: templateIdStr,
              name: tplDoc?.name,
              content: tplDoc?.content || null,
              attachments: tplDoc?.attachments || [], 
            });

            secondTemplateIds.add(templateIdStr);
          } else {
            console.log(`Template ${templateIdStr} ya incluida en secondMessages, omitiendo duplicado.`);
          }

        }
      }

      return {
        ...item,
        product: {
          id: product.id,
          templates: templatesWithContent, 
        },
      };
    }));

    const configuredItems = itemsWithProductDetails.filter(Boolean);
    if (!configuredItems.length) return null;

    return {
      orderId,
      buyerId: orderDetails.buyer.id,
      packId: orderDetails.pack_id,
      items: configuredItems,
      secondMessages: allSecondMessages,
      secondMessageDelay: delayCandidates.length ? Math.min(...delayCandidates) : 24,
      orderDate: orderDetails.date_created,
      totalAmount: orderDetails.total_amount,
      currencyId: orderDetails.currency_id,
      status: orderDetails.status,
    };
  } catch (error) {
    console.error('Error al procesar la notificación:', error.message);
    throw error;
  }
};

/**
 * Obtiene los detalles de una orden desde la API de Mercado Libre.
 * @param {string} orderId - ID de la orden.
 * @returns {object} - Detalles de la orden.
 */
export const fetchOrderDetails = async (orderId, accessToken) => {

  if (!accessToken) {
    throw new Error('No se encontró el token de acceso. Asegúrate de estar autenticado.');
  }

  const url = `https://api.mercadolibre.com/orders/${orderId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('Error al obtener detalles de la orden:', errorBody);
    throw new Error(`Error al consultar la orden ${orderId}`);
  }

  const orderCaptured = await response.json();
  
  return orderCaptured;
};
