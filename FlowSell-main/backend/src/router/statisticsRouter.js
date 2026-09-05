import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { exportSalesStatistics, getSalesStatistics } from '../controllers/statisticsController.js';

const statisticsRouter = express.Router();

statisticsRouter.get('/sales', requireAuth, getSalesStatistics);
statisticsRouter.get('/sales/export', requireAuth, exportSalesStatistics);

export default statisticsRouter;
