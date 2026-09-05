import express from "express";
import authRouter from './authRouter.js'
import messagesRouter from './messagesRouter.js'
import usersRouter from './usersRouter.js'
import templateRouter from './templateRouter.js'
import paymentsRouter from './paymentsRouter.js'
import productsRouter from "./productsRouter.js";
import clientTrackingRouter from "./clientTrackingRouter.js";
import jobsRouter from "./jobsRouter.js";
import statisticsRouter from './statisticsRouter.js';

const apiRouter = express.Router();

apiRouter.use('/auth', authRouter); 
apiRouter.use('/users', usersRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/messages", messagesRouter);
apiRouter.use('/templates', templateRouter);  
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/client-tracking', clientTrackingRouter);  
apiRouter.use('/jobs', jobsRouter); 
apiRouter.use('/statistics', statisticsRouter);

export default apiRouter;
