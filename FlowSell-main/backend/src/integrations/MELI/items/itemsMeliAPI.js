export const getItemsMELI = async (userID, offset, limit, accessToken) => {
  try {
    const response = await fetch(`https://api.mercadolibre.com/users/${userID}/items/search?offset=${offset}&limit=${limit}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error en la respuesta de Mercado Libre:", errorText);
      throw new Error('Error en la respuesta de Mercado Libre al obtener productos.');
    }
    
    const data = await response.json();

    return data
  } catch (error) {
    throw error;
  }
};

export const getItemIDMELI = async (itemID, accessToken) => {
  try {

    const responseItem = await fetch(`https://api.mercadolibre.com/items/${itemID}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!responseItem.ok) {
      const errorText = await responseItem.text();
      console.log("Error al obtener el producto:", errorText);
      throw new Error(`Error al obtener el producto con ID: ${itemID}`);
    }

    const productData = await responseItem.json();

    return productData; 
  } catch (error) {
    throw error;
  }
};
