import express from "express";
import { getUserMe } from "../controllers/usersController.js";
import { requireAuth } from "../middlewares/auth.js";

const usersRouter = express.Router();

usersRouter.get('/me', requireAuth, getUserMe);

export default usersRouter;
