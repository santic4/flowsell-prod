import { Template } from "../models/Template.js";

class TemplatesDAO{
    async getTemplates(userId){

        const templates = await Template.find({ owner: userId }).lean();
  
        return templates;
    };

    async getTemplateByID(id, userId){

        const template = await Template.findOne({ _id: id, owner: userId }).lean();

        return template;
    };

    async getTemplatesByIDs(templateIds, userId){

        const templatesDocs = await Template.find({ 
          _id: { $in: templateIds },
          owner: userId
        }).select('name content attachments');

        return templatesDocs;
    };

    async getTemplatesForID(templateIds, userId){
        return Template.find({
          _id:      { $in: templateIds },
          owner:    userId
        })
    };

    async createTemplate(name, filterContent, assignedPublications, newImageUrls, userId){
        const template = await Template.create({ name, content: filterContent, assignedPublications, attachments: newImageUrls, owner: userId });

        return template;
    };

    async updateManyTemplates(templateIds, productAsign, userId){

        return Template.updateMany(
              {
                _id:      { $in: templateIds },
                owner:    userId
              },
              {
                $addToSet: { assignedPublications: productAsign }
              }
            )
    };

    async updateTemplate(id, name, filterContent, assignedPublications, finalAttachments, userId){

        const update = {
          name,
          content: filterContent,
          assignedPublications: Array.isArray(assignedPublications) ? assignedPublications : [],
          attachments: finalAttachments
        };
    
        const updatedTemplate = await Template.findOneAndUpdate(
          { _id: id, owner: userId },
          update,
          {
            new: true,    
            runValidators: true
          }
        ).exec();
        return updatedTemplate;
    };

    async deleteTemplate(id, userId){

        const template = await Template.findOneAndDelete({
          _id: id,
          owner: userId
        });

        return template;
    };

}

export const templatesDao = new TemplatesDAO()
