import express from "express";
import { addTemplateToProduct, getProductById, asignTemplate, deleteProductAsign, delayAsign, deleteTemplate, deleteSecondTemplate, getProductsController, getSavedProducts, getTemplatesByProduct, reorderTemplateInProduct, assignTemplateToAllProducts } from "../controllers/productsController.js";
import { requireAuth } from "../middlewares/auth.js";

const productsRouter = express.Router();

productsRouter.get('/', requireAuth, getProductsController);
productsRouter.post('/:id/assign-templates-modal', requireAuth, asignTemplate);
productsRouter.post('/:productId/assign-delay', requireAuth, delayAsign);
productsRouter.get("/saved", requireAuth, getSavedProducts);
productsRouter.get("/template/:productId", requireAuth, getTemplatesByProduct);
productsRouter.delete("/:productId/templates/:templateId", requireAuth, deleteTemplate);
productsRouter.delete("/:productId/second-template/:templateId", requireAuth, deleteSecondTemplate);
productsRouter.post("/:productId/assign-template", requireAuth, addTemplateToProduct);
productsRouter.patch("/:productId/templates/reorder", requireAuth, reorderTemplateInProduct);
productsRouter.delete("/:productId/saved-product", requireAuth, deleteProductAsign);
productsRouter.get("/:productId/refetch-id", requireAuth, getProductById);
productsRouter.post('/assign-template-to-all', requireAuth, assignTemplateToAllProducts);

export default productsRouter;