export const fetchPendingMessages = async (token) => {
  try {
    const response = await fetch("https://api.mercadolibre.com/my/received_questions/search?status=UNANSWERED&limit=50&offset=0&api_version=4", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error("Error en la respuesta de la API:", response.status, response.statusText);
      throw new Error("Error al consultar la API de Mercado Libre");
    }
    const data = await response.json();
    return data.questions?.map((msg) => ({
      message_id: msg.id,
      sender_name: msg.seller_id,
      publication_id: msg.item_id,
      text: msg.text,
    })) || [];
  } catch (error) {
    throw error;
  }
};

export const sendMessageAPI = async (PACK_ID, accessToken, message, CLIENT_ID, sellerId) => {
  try {
    const response = await fetch(
      `https://api.mercadolibre.com/messages/packs/${PACK_ID}/sellers/${sellerId}?tag=post_sale`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'content-type': 'application/json',
          'x-client-id': `${CLIENT_ID}`,
        },
        body: JSON.stringify(message),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || 'Mercado Libre no pudo enviar el mensaje.');
      error.status = response.status === 401 ? 401 : 502;
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};
