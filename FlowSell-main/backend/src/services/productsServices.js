import { getItemIDMELI, getItemsMELI } from "../integrations/MELI/items/itemsMeliAPI.js";
import { productsDAO } from "../DAO/productsDao.js";
import { templatesDao } from "../DAO/templateDao.js";
import { Types } from "mongoose";
import { templatesServices } from "./templatesServices.js";

class ProductServices{
    async getProduct(id, userId){
      try{
        if (!id) {
          throw new Error('ID no encontrado');
        }
        const product = await productsDAO.getProduct(id, userId);
        return product;
      } catch (error) {
        throw error;
      }
    }

    async getProductByID(productId, userId){
      try{
        if (!productId) {
          throw new Error('ID no encontrado');
        }
        const product = await productsDAO.getProduct(productId, userId)

        if (!product) {
          throw new Error('Producto no encontrado');
        }
    
        return product;
      } catch (error) {
        throw error;
      }
    }

    async deleteProduct(productId, userId){
      try{          
        if (!productId) {
          throw new Error('ID no encontrado');
        }
        const product = await productsDAO.deleteProduct(productId, userId);
          
        if (!product) {
          throw new Error('Producto no encontrado');
        }

        return product;
      } catch (error) {
        throw error;
      }
    }

    async deleteTemplateAsigned(productId, templateId, userId, variationId = null){
      try{
        const product = await productsDAO.getProduct(productId, userId);
          
        if (!product) {
          throw new Error('Producto no encontrado');
        }
      
        let response;
        if (variationId) {
          const variations = (product.variations || []).map((variation) => {
            if (String(variation.id) !== String(variationId)) return variation;
            return {
              ...variation,
              templates: (variation.templates || []).filter((template) => String(template.templateId?._id || template.templateId) !== String(templateId)),
            };
          });
          response = await productsDAO.updateProduct(productId, variations, 'variations', userId);
        } else {
          const templates = (product.templates || []).filter((template) => String(template.templateId?._id || template.templateId) !== String(templateId));
          response = await productsDAO.updateProduct(productId, templates, 'templates', userId);
        }

        return response;
      } catch (error) {
        throw error;
      }
    }

    async deleteSecondTemplateAsigned(productId, templateId, userId){
      try{
        const product = await productsDAO.getProduct(productId, userId);
          
        if (!product) {
          throw new Error('Producto no encontrado');
        }
      
        const change = product.secondMessages.filter((template) => template.templateId.toString() !== templateId);
    
        const secondMessagesField = 'secondMessages';

        const response = await productsDAO.updateProduct(productId, change, secondMessagesField, userId);

        return response;
      } catch (error) {
        throw error;
      }
    }

    async asignTemplatesServices(id, variationId, productAsign, variationName, templateObjects, userId){
      try {
        // Intentamos obtener el documento o plain object según tu DAO
        let product = await productsDAO.getProduct(id, userId);
      
        // Si no existe, lo creamos como antes
        if (!product) {
          if (variationId) {
            product = await productsDAO.createProductWithVariations(
              id,
              variationId,
              variationName,
              templateObjects,
              productAsign,
              userId
            );
          } else {
            product = await productsDAO.createProductWithoutVariations(
              id,
              templateObjects,
              productAsign,
              userId
            );
          }
          return product;
        }
      
        // Si existe, preparamos la actualización dinámica
        // Primero, el array o campo a actualizar dentro del documento
        if (variationId) {
          // Construimos el array completo de variations actualizado
          const updatedVariations = product.variations || [];
          const idx = updatedVariations.findIndex(v => v.id === variationId);
        
          if (idx > -1) {
            // Reemplazamos la variante 
            updatedVariations[idx] = {
              ...updatedVariations[idx],
              name: variationName,
              templates: templateObjects
            };
          } else {
            // Insertar nueva variante
            updatedVariations.push({
              id: variationId,
              name: variationName,
              templates: templateObjects
            });
          }
        
          // Usamos el DAO genérico para actualizar "variations"
          return productsDAO.updateProduct(
            id,
            updatedVariations,
            'variations',
            userId
          );
        } else {
          // Actualizar plantillas globales
          return productsDAO.updateProduct(
            id,
            templateObjects,
            'templates',
            userId
          );
        }
      } catch (error) {
        throw error;
      }
    }

    async addTemplateToProduct(productId, templateIds, userId){
  try {
    if (!Array.isArray(templateIds)) {
      throw new Error('El campo templateIds debe ser un arreglo.');
    }

    // 1) Traigo el producto (documento o plain object según tu DAO)
    const product = await productsDAO.getProduct(productId, userId);
    if (!product) {
      throw new Error('Producto no encontrado.');
    }

    const addedTemplates = [];
    const skippedTemplates = [];

    // 2) Inicializo `existing` con lo que ya existía
    const existing = product.templates.map(t => ({
      templateId: t.templateId,
      name: t.name
    }));

    // 3) Itero cada ID nuevo
    for (const rawId of templateIds) {
      // Normalizo a ObjectId si es string válido
      const oid = (typeof rawId === 'string' && Types.ObjectId.isValid(rawId))
        ? new Types.ObjectId(rawId)
        : rawId;

      // Busco la plantilla en el DAO
      const template = await templatesDao.getTemplateByID(oid, userId);
      if (!template) {
        skippedTemplates.push({ templateId: rawId, reason: "Plantilla no encontrada." });
        continue;
      }

      // Verifico duplicado contra el array original
      const exists = existing.some(
        t => t.templateId.toString() === oid.toString()
      );
      if (exists) {
        skippedTemplates.push({ templateId: rawId, reason: "La plantilla ya está asignada." });
        continue;
      }

      // Agrego al resultado y preparo para persistir
      const entry = { templateId: template._id, name: template.name };
      existing.push(entry);
      addedTemplates.push(entry);
    }

    // 4) Concateno todas (previas + nuevas) y actualizo
    const fullTemplates = existing; // ya incluye previas + added
    await productsDAO.updateProduct(
      productId,
      fullTemplates,
      'templates',
      userId
    );

    return { addedTemplates, skippedTemplates };
  } catch (error) {
    throw error;
  }
    }

    async reorderTemplateInProduct(productId, templateId, direction, userId, variationId = null){
      try{
        const product = await productsDAO.getProductDocument(productId, userId);
        if (!product) {
          throw new Error('Producto no encontrado.');
        }
      
        const normalizedTemplateId = String(templateId?._id || templateId);
        const variation = variationId
          ? product.variations.find((item) => String(item.id) === String(variationId))
          : null;
        if (variationId && !variation) throw new Error('Variante no encontrada.');
        const targetTemplates = variation ? variation.templates : product.templates;
        const index = targetTemplates.findIndex(
          (template) => String(template.templateId?._id || template.templateId) === normalizedTemplateId
        );
      
        if (index === -1) {
          throw new Error('Plantilla no asignada.');
        }
      
        // Determinar el nuevo índice basado en la dirección
        let newIndex;
        if (direction === "up") {
          newIndex = index - 1;
        } else if (direction === "down") {
          newIndex = index + 1;
        } else {
          throw new Error('Dirección no válida.');
        }
      
        // Verificar límites del array
        if (newIndex < 0 || newIndex >= targetTemplates.length) {
          throw new Error('No se puede mover en esa dirección.');
        }
      
        // Intercambiar la plantilla actual con la plantilla en la nueva posición
        const temp = targetTemplates[index];
        targetTemplates[index] = targetTemplates[newIndex];
        targetTemplates[newIndex] = temp;
        product.markModified(variation ? 'variations' : 'templates');
      
        await product.save();

        return product;
      } catch (error) {
        throw error;
      }
    }

    async delayAsign(productId, delayHours, userId){
      try{
        if (typeof delayHours !== 'number' || delayHours < 1 || delayHours > 72) {
          throw new Error('delayHours debe ser un número entre 1 y 72');
        }
        const product = await productsDAO.getProduct(productId, userId);
        if (!product) {
          throw new Error('Producto no encontrado');
        }

        const change = delayHours;

        const secondMessageDelayField = 'secondMessageDelay';

        const response = await productsDAO.updateProduct(productId, change, secondMessageDelayField, userId);

        return response;
      } catch (error) {
        throw error;
      }
    }

    async getProductsServices(accessToken, userID){

      let allProducts = [];
      let offset = 0;
      const limit = 50; 
    
      try {
        while (true) {

          const data = await getItemsMELI(userID, offset, limit, accessToken);

          allProducts = allProducts.concat(data.results);
    
          // Verifica si hay más productos por obtener
          if (offset + limit >= data.paging.total) {
            break;
          }
    
          offset += limit;
        }
    
        return allProducts;
      } catch (error) {
        throw error;
      }
    };

    async getDetailsProduct(accessToken, productsData){

        try {
            const productDetailsPromises = productsData.map(itemID =>
              getItemIDMELI(itemID, accessToken)
            );

            const productDetails = await Promise.all(productDetailsPromises);

            const productsSummary = productDetails.map(product => ({
              title: product.title,
              site_id: product.site_id,
              id: product.id,
              variations: product.variations,
              status: product.status,
              thumbnail: product.thumbnail,
              permalink: product.permalink,
              price: product.price,
              currency_id: product.currency_id,
              available_quantity: product.available_quantity,
              sold_quantity: product.sold_quantity,
            }));
        
            return productsSummary; 
        } catch (error) {
          throw error;
        }
    };

    async assignTemplateToAllProducts(userId, templateId) {
      // Obtén la plantilla completa (puedes ajustar según tu modelo)
      const template = await templatesServices.getTemplateByID(templateId, userId);
      if (!template) throw new Error("Plantilla no encontrada");

      // Obtén todos los productos del usuario
      const products = await productsDAO.getAllProducts(userId);

      let updatedCount = 0;

      for (const product of products) {
        let updated = false;

        // Si tiene variaciones, asigna a cada una
        if (product.variations && product.variations.length > 0) {
          for (const variation of product.variations) {
            // Evita duplicados
            if (!variation.templates.some(t => t.templateId.equals(template._id))) {
              variation.templates.push({
                templateId: template._id,
                name: template.name,
              });
              updated = true;
            }
          }
        } else {
          // Si no tiene variaciones, asigna en templates principal
          if (!product.templates.some(t => t.templateId.equals(template._id))) {
            product.templates.push({
              templateId: template._id,
              name: template.name,
            });
            updated = true;
          }
        }

        if (updated) {
          await productsDAO.saveProduct(product);
          updatedCount++;
        }
    }

    return { updatedCount };
  }

}

export const productServices = new ProductServices()
