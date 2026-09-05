import { imageDeleteFBService } from '../integrations/Firebase/firebaseAPI.js';
import { Template } from '../models/Template.js';
import { templatesServices } from '../services/templatesServices.js';

export const createTemplate = async (req, res, next) => {
  const userId = req.user._id;
  const { name, content, assignedPublications } = req.body;
  const { files } = req;
  try {
    const template = await templatesServices.createTemplate(name, content, assignedPublications, files, userId);
    res.status(201).json(template);
  } catch (error) {
    next(error)
  }
};

export const getTemplates = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const templates = await templatesServices.getAllTemplates(userId);

    res.json(templates);
  } catch (error) {
    next(error)
  }
};

export const assignSecondMessages = async (req, res, next) => {
  const userId = req.user._id;
  const { productId } = req.params;
  const { templateIds } = req.body;
  
  try {
    const response = await templatesServices.assignSecondMessages(productId, templateIds, userId);

    return res.status(200).json(response);
  } catch (error) {
    next(error)
  }
};

export const updateTemplate = async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.params;
  const { files } = req;
  const { name, content, assignedPublications, attachmentsRaw } = req.body;

  try {
    let parsedAttachments = [];
    if (Array.isArray(attachmentsRaw)) parsedAttachments = attachmentsRaw;
    else if (typeof attachmentsRaw === 'string' && attachmentsRaw) {
      try {
        const parsed = JSON.parse(attachmentsRaw);
        parsedAttachments = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedAttachments = [];
      }
    }
    const publications = Array.isArray(assignedPublications)
      ? assignedPublications
      : assignedPublications ? [assignedPublications] : [];
    const updatedTemplate = await templatesServices.updateTemplate(id, files, name, content, publications, parsedAttachments, userId);
    res.status(200).json(updatedTemplate);
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.params;

  try {
    const template = await templatesServices.getTemplateByID(id, userId);

    if(!template) throw new Error('Plantilla no encontrada');

    const templateImagesToDelete = template?.attachments;

    await imageDeleteFBService(templateImagesToDelete);

    await templatesServices.deleteTemplate(id, userId);

    res.status(200).json({ message: 'Plantilla eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la plantilla:', error);
    next(error)
  }
};
