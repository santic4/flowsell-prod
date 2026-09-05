import express from "express";
import { assignSecondMessages, createTemplate, getTemplates, updateTemplate, deleteTemplate } from "../controllers/templateController.js";
import { upload } from "../middlewares/multer.js";
import { requireAuth } from "../middlewares/auth.js";

const templateRouter = express.Router();

const handleUpload = upload.fields([
  { name: 'images-posventa', maxCount: 20 }
]);

templateRouter.post('/:productId/assign-second-messages', 
  requireAuth,
  assignSecondMessages
);

templateRouter.post("/", 
  requireAuth,
  handleUpload,
  createTemplate
);
    
templateRouter.get("/", 
  requireAuth,
  getTemplates
);

templateRouter.delete('/:id', 
  requireAuth,
  deleteTemplate
);

templateRouter.put("/:id", 
  requireAuth,
  handleUpload,
  updateTemplate);

export default templateRouter;