import express from "express";
import { getMessages, replyMessage } from "../controllers/messageController.js";
import { requireAuth } from "../middlewares/auth.js";

const messagesRouter = express.Router();

messagesRouter.get("/", requireAuth, getMessages);
messagesRouter.post("/:messageId/reply", requireAuth, replyMessage);

export default messagesRouter;