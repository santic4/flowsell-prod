import { getCurrentUserData } from "../services/user/userServices.js";

export function getUserMe(req, res, next) {
  const user = req.user;

  try {
    const dto = getCurrentUserData(user);
    res
      .status(200)
      .json(dto);
  } catch (error) {
    next(error);
  }
}