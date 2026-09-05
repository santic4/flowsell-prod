import { usersDAO } from "../../DAO/usersDao.js";
import { UserDTO } from "../../DTO/userDTO.js";

export async function findOrCreateUser({ meliId, email, nickname, picture, accessToken, refreshToken, expiresAt }) {
 return await usersDAO.findOrCreate({ meliId, email, nickname, picture, accessToken, refreshToken, expiresAt });
}

export async function getById(id) {
  return await usersDAO.findById(id);
}

export async function getByIdWithTokens(id) {
  return await usersDAO.findByIdWithTokens(id);
}

export function getCurrentUserData(user) {
  if (!user) {
    throw new Error('Usuario no autenticado');
  }
  
  return new UserDTO(user);
}

export async function findOneUser(user_id) {
  return await usersDAO.findOneUser(user_id);
}
