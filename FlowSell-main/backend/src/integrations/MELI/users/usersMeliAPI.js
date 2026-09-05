export const getUserMELI = async (accessToken) => {

    try {
        const responseUser = await fetch("https://api.mercadolibre.com/users/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      
        if (!responseUser.ok) {
            throw new Error('Error en la respuesta de Mercado Libre al obtener usuario.')
        }
      
        const dataUser = await responseUser.json();

      return dataUser;
    } catch (error) {
      console.error("Error al obtener información del usuario desde la API:", error.message);
      throw error;
    }
};
