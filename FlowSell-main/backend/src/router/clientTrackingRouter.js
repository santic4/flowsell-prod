import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getBuyers, getJobStatus, handleSendMessagesMassive } from "../controllers/clientTrackingController.js";

const clientTrackingRouter = express.Router();

clientTrackingRouter.post('/', requireAuth, getBuyers);
clientTrackingRouter.post('/send', requireAuth, handleSendMessagesMassive);
clientTrackingRouter.get('/buyers/:jobId', requireAuth, getJobStatus);

export default clientTrackingRouter;
