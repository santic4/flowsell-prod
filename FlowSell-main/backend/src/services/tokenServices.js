import { CLIENT_ID, CLIENT_SECRET } from "../config/config.js";
import User from "../models/User.js";

class TokenServices{

    async updateTokenInDB (newAccessToken, newRefreshToken, expiresIn, meliId) {

        try {
          if (!meliId) throw new Error('No se recibió el identificador de la cuenta de Mercado Libre.');
          const expiresAt = new Date(Date.now() + Number(expiresIn || 0) * 1000);
          const tokenUpdate = {
            accessToken: newAccessToken,
            expiresIn,
            lastUpdated: Date.now(),
            expiresAt,
            ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
          };
          const updatedToken = await User.findOneAndUpdate(
              { meliId },
              tokenUpdate,
              { new: true }
            ).select('+accessToken +refreshToken');

            if (!updatedToken) throw new Error('No se encontró el usuario para actualizar su token.');

            return updatedToken;
        } catch (error) {
          console.error("Error al actualizar token:", error.message);
          throw error;
        }
    };

    async refreshAccessToken(user) {

        try {
         
            const meliId = user.meliId;

            const url = "https://api.mercadolibre.com/oauth/token";
            const params = new URLSearchParams();
            params.append("grant_type", "refresh_token");
            params.append("client_id", `${CLIENT_ID}`); 
            params.append("client_secret", `${CLIENT_SECRET}`); 
            params.append("refresh_token", user.refreshToken);
        
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            });
        
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Error ${response.status}: ${errorData.message}`);
            }
        
            const { access_token, refresh_token, expires_in } = await response.json();
        
            // Actualiza el token en la base de datos
            const updatedToken = await this.updateTokenInDB(access_token, refresh_token, expires_in, meliId);
        
            return updatedToken.accessToken;
        } catch (error) {
          console.error("Error al actualizar token:", error.message);
          throw error;
        }
    };

    
  async getValidAccessToken (user) {

    if (!user) {
      throw new Error('Data invalid.')
    }

    if (!user.accessToken) return this.refreshAccessToken(user);

    const expiresAt = new Date(user.expiresAt).getTime();
    const refreshMarginMs = 5 * 60 * 1000;
    if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt - refreshMarginMs) {
      console.log("El token expiró, renovando...");
      return await this.refreshAccessToken(user);
    }

    return user.accessToken;
  };

}

export const tokenServices = new TokenServices()
