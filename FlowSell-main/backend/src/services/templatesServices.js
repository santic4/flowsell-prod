import { deleteTemplateImages, uploadTemplateImages } from "../integrations/Cloudinary/cloudinaryAPI.js";
import { productsDAO } from "../DAO/productsDao.js";
import { templatesDao } from "../DAO/templateDao.js";

class TemplatesServices{
    async getAllTemplates(userId){

        const templates = await templatesDao.getTemplates(userId);

        if (!templates) {
          throw new Error('Plantillas no encontradas.')
        }

        return templates;
    };

    async getTemplateByID(id, userId){
        if(!id) throw new Error('TemplateId no existe.')
        const template = await templatesDao.getTemplateByID(id, userId);
        if (!template) {
          throw new Error('Plantilla no encontrada.')
        }
        return template;
    };

    async getTemplatesByIDs(templateIds, userId){
        if (!Array.isArray(templateIds) || !templateIds.length) {
          throw new Error('Seleccioná al menos una plantilla.');
        }
        const uniqueIds = [...new Set(templateIds.map(String))];
        const templatesDocs = await templatesDao.getTemplatesByIDs(uniqueIds, userId);
        if (templatesDocs.length !== uniqueIds.length) {
          throw new Error('Una o más plantillas no existen o no pertenecen a este usuario.');
        }

        return templatesDocs;
    };

    async createTemplate(name, content, assignedPublications, files, userId){
        const normalizedName = typeof name === 'string' ? name.trim() : '';
        if (!normalizedName || normalizedName.length > 70) {
          throw new Error('El nombre debe tener entre 1 y 70 caracteres.');
        }
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('El mensaje de la plantilla es obligatorio.');
        }
        const uploadCount = files?.['images-posventa']?.length || 0;
        if (uploadCount > 20) throw new Error('Cada plantilla admite hasta 20 imágenes.');

        let filterContent = content;
        // normalizo saltos de línea
        const normalized = filterContent.replace(/\r\n/g, '\n');

        if (normalized.length > 350) {
          throw new Error('El contenido supera el límite de 350 caracteres.');
        }

        filterContent = normalized;
      
        let newImageUrls = [];
        if (uploadCount) newImageUrls = await uploadTemplateImages(files, userId);

        const publications = Array.isArray(assignedPublications)
          ? assignedPublications.filter(Boolean)
          : assignedPublications ? [assignedPublications] : [];
        try {
          return await templatesDao.createTemplate(normalizedName, filterContent, publications, newImageUrls, userId);
        } catch (error) {
          if (newImageUrls.length) {
            await deleteTemplateImages(newImageUrls).catch(cleanupError => {
              console.warn('No se pudieron limpiar imágenes nuevas de Cloudinary:', cleanupError.message);
            });
          }
          throw error;
        }
    };
    
    async getTemplatesForID(templateIds, userId){
      try {
        if(!templateIds) throw new Error('TemplatesIds no existe.')

        const templates = await templatesDao.getTemplatesForID(templateIds, userId);

        if (templates.length !== templateIds.length) {
          throw new Error('Algunas plantillas no son válidas.');
        }

        const templateObjects = templateIds.map(templateId => {
          const template = templates.find(t => t._id.toString() === templateId);
          return template ? { templateId: template._id, name: template.name } : null;
        }).filter(t => t !== null);

        return templateObjects; 
      } catch (error) {
        throw error;
      }
    };

    async assignSecondMessages(productId, templateIds, userId){
      try{
        if (!productId || !templateIds) {
          throw new Error('IDs no encontrados.');
        }

        let secondArray = [];
      
        if (Array.isArray(templateIds) && templateIds.length > 0) {
          // 1) Buscamos todos los Template cuyo _id esté en templateIds
          const templatesDocs = await templatesDao.getTemplatesByIDs(templateIds, userId);
        
          // 2) Creamos un mapa { id: TemplateDoc } para mantener orden
          const templateMap = {};
          templatesDocs.forEach(t => {
            templateMap[t._id.toString()] = t;
          });
        
          // 3) Recorremos templateIds en el mismo orden que vienen en el body
          secondArray = templateIds.map(id => {
            const tDoc = templateMap[id];
            return {
              templateId: id,
              name: tDoc ? tDoc.name : '' // si no se encuentra, queda vacío
            };
          });
        }

        const secondMessagesField = 'secondMessages';

        const updated = await productsDAO.updateProduct(productId, secondArray, secondMessagesField, userId);
   
        return updated;
      } catch (error) {
        throw error;
      }
    }
    
    async updateTemplate(id, files, name, content, assignedPublications, attachmentsRaw, userId){
      try{
        const template = await templatesDao.getTemplateByID(id, userId);
        if (!template) throw new Error('Plantilla no encontrada.');
        const normalizedName = typeof name === 'string' ? name.trim() : '';
        if (!normalizedName || normalizedName.length > 70) {
          throw new Error('El nombre debe tener entre 1 y 70 caracteres.');
        }
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('El mensaje de la plantilla es obligatorio.');
        }
  
        const normalized = content.replace(/\r\n/g, '\n');
        if (normalized.length > 350) {
          throw new Error('El contenido supera el límite de 350 caracteres.');
        }

        // Identificar imágenes que fueron eliminadas en el front.
        const oldAttachments = template.attachments || [];
        const removedAttachments = Array.isArray(attachmentsRaw) ? attachmentsRaw : [];
        const toDelete = oldAttachments.filter(url => removedAttachments.includes(url));
        const remainingAttachments = oldAttachments.filter(url => !toDelete.includes(url));

        const uploadCount = files?.['images-posventa']?.length || 0;
        if (remainingAttachments.length + uploadCount > 20) {
          throw new Error('Cada plantilla admite hasta 20 imágenes.');
        }

        let newImageUrls = [];
        if (uploadCount) newImageUrls = await uploadTemplateImages(files, userId);
      
        const finalAttachments = [...remainingAttachments, ...newImageUrls];

        try {
          const updatedTemplate = await templatesDao.updateTemplate(
            id,
            normalizedName,
            normalized,
            assignedPublications,
            finalAttachments,
            userId,
          );
          if (!updatedTemplate) throw new Error('Plantilla no encontrada.');

          if (toDelete.length) {
            await deleteTemplateImages(toDelete).catch(cleanupError => {
              console.warn('La plantilla se actualizó, pero Cloudinary no pudo limpiar algunas imágenes:', cleanupError.message);
            });
          }
          return updatedTemplate;
        } catch (error) {
          if (newImageUrls.length) {
            await deleteTemplateImages(newImageUrls).catch(cleanupError => {
              console.warn('No se pudieron limpiar imágenes nuevas de Cloudinary:', cleanupError.message);
            });
          }
          throw error;
        }
      } catch (error) {
        throw error;
      }
    }

    async updateManyTemplates(templateIds, productAsign, userId){

      if(!templateIds || !productAsign) throw new Error('Data invalid.')
      const templatesUpdated = await templatesDao.updateManyTemplates(templateIds, productAsign, userId)

      if (!templatesUpdated) {
        throw new Error('Error al actualizar plantillas.')
      }
      return templatesUpdated;
    };

    async deleteTemplate(templateId, userId){

      if(!templateId) throw new Error('Data invalid.')

      const template = await templatesDao.getTemplateByID(templateId, userId);
      if (!template) throw new Error('Plantilla no encontrada.');

      const templatesUpdated = await templatesDao.deleteTemplate(templateId, userId);

      if (!templatesUpdated) {
        throw new Error('Error al actualizar plantillas.')
      }
      await productsDAO.removeTemplateReferences(userId, templateId);
      if (template.attachments?.length) {
        await deleteTemplateImages(template.attachments).catch(cleanupError => {
          console.warn('La plantilla se eliminó, pero Cloudinary no pudo limpiar algunas imágenes:', cleanupError.message);
        });
      }
      return templatesUpdated;
    };

}

export const templatesServices = new TemplatesServices()
