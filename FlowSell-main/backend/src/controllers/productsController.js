import { productServices } from "../services/productsServices.js";
import { templatesServices } from "../services/templatesServices.js";
import { productsDAO } from "../DAO/productsDao.js";
import { tokenServices } from "../services/tokenServices.js";

export const getProductsController = async (req, res, next) => {
  const user = req.user;

  const token = await tokenServices.getValidAccessToken(user);
  const meliId = user.meliId;

  try {

    const productsData = await productServices.getProductsServices(token, meliId);

    const detailsProducts = await productServices.getDetailsProduct(token, productsData);

    res.status(200).json(detailsProducts);
  } catch (error) {
    next(error)
  }
}

export const assignTemplateToAllProducts = async (req, res, next) => {
  const userId = req.user._id;
  const { templateId } = req.body;

  try {
    const result = await productServices.assignTemplateToAllProducts(userId, templateId);
    res.status(200).json({ message: "Plantilla asignada a todas las publicaciones.", result });
  } catch (error) {
    next(error);
  }
};

export const asignTemplate = async (req, res, next) => {
  const userId = req.user._id
  const { id } = req.params;
  const { templateIds, productAsign, variationId, variationName } = req.body;

  try {
    const templateObjects = await templatesServices.getTemplatesForID(templateIds, userId);

    await templatesServices.updateManyTemplates(templateIds, productAsign, userId)

    const result = await productServices.asignTemplatesServices(id, variationId, productAsign, variationName, templateObjects, userId)

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSavedProducts = async (req, res, next) => {
  const userId = req.user._id;
  
  try {
    const allProducts = await productsDAO.getAllProducts(userId);

    res.status(200).json(allProducts);
  } catch (error) {
    next(error);
  }
};

export const getTemplatesByProduct = async (req, res, next) => {
  const userId = req.user._id;

  try {
    const { productId } = req.params;

    const product = await productServices.getProduct(productId, userId);

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({
      templates: product.templates || [],
      variations: product.variations || [],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  const userId = req.user._id;
  const { productId, templateId } = req.params;
  const { variationId } = req.query;

  try {
    await productServices.deleteTemplateAsigned(productId, templateId, userId, variationId);

    res.status(200).json({ message: "Plantilla eliminada correctamente." });
  } catch (error) {
    next(error);
  }
};

export const deleteSecondTemplate = async (req, res, next) => {
  const userId = req.user._id;
  const { productId, templateId } = req.params;

  try {
    await productServices.deleteSecondTemplateAsigned(productId, templateId, userId);

    res.status(200).json({ message: "Segunda plantilla eliminada correctamente." });
  } catch (error) {
    next(error);
  }
};

export const deleteProductAsign = async (req, res, next) => {
  const userId = req.user._id;
  const { productId } = req.params;

  try {
    await productServices.deleteProduct(productId, userId);

    res.status(200).json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    next(error);
  }
};

export const addTemplateToProduct = async (req, res, next) => {
  const userId = req.user._id;
  const { productId } = req.params;
  const { templateIds } = req.body; // Array de IDs

  try {
    const { addedTemplates, skippedTemplates } = await productServices.addTemplateToProduct(productId, templateIds, userId);

    res.status(200).json({
      message: "Plantilla(s) añadida(s) correctamente.",
      addedTemplates,
      skippedTemplates,
    });
  } catch (error) {
    next(error);
  }
};

export const reorderTemplateInProduct = async (req, res, next) => {
  const userId = req.user._id;
  const { productId } = req.params;
  const { templateId, direction, variationId } = req.body; 

  try {
    const product = await productServices.reorderTemplateInProduct(productId, templateId, direction, userId, variationId);
    res.status(200).json({
      message: "Orden actualizado correctamente.",
      templates: product.templates,
    });
  } catch (error) {
    next(error);
  }
};

export const delayAsign = async (req, res, next) => {
  const userId = req.user._id;
  const { productId } = req.params;
  const { delayHours } = req.body;

  try {
    const product = await productServices.delayAsign(productId, delayHours, userId);

    return res.status(200).json({
      message: 'secondMessageDelay actualizado',
      secondMessageDelay: product.secondMessageDelay
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  const userId = req.user._id;
  const { productId } = req.params;

  try {
    const product = await productServices.getProductByID(productId, userId);
    return res.json(product);
  } catch (err) {
    next(err)
  }
};
