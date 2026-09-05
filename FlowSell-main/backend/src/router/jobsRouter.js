import express from "express";
import { updateJobController } from "../controllers/jobController.js";
import { requireAuth } from '../middlewares/auth.js';

const jobsRouter = express.Router();

jobsRouter.put('/', requireAuth, updateJobController);

export default jobsRouter;
