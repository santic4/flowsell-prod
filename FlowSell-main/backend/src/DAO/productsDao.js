import { Product } from "../models/Product.js";

class ProductDAO{
    async getAllProducts(userId){
      try{
        const products = await Product.find({ owner: userId })
          .populate("templates.templateId")
          .populate("secondMessages.templateId")
          
        return products;
      } catch (error) {
        throw error;
      }
    }
    
    async getProduct(id, userId) {
      try {
        const product = await Product.findOne({ id, owner: userId }).lean();
        return product;
      } catch (error) {
        console.error('Error al consultar el producto:', error.message);
        throw error;
      }
    }

    async getProductDocument(id, userId){
        const product = await Product.findOne({ id, owner: userId });
        return product;
    };

    async createProductWithVariations(id, variationId, variationName, templateObjects, productAsign, userId) {
      return Product.create({
        id,
        owner:      userId,             
        title:      productAsign,
        templates:  [],
        variations: [{ id: variationId, name: variationName, templates: templateObjects }],
      });
    }
    
    async createProductWithoutVariations(id, templateObjects, productAsign, userId) {
      return Product.create({
        id,
        owner:     userId,              
        title:     productAsign,
        templates: templateObjects,
      });
    }
    
    async updateProduct(productId, changes, campo, userId) {
      const updateObj = { [campo]: changes };

      return Product.findOneAndUpdate(
        { id: productId, owner: userId },
        updateObj,                       
        { new: true }                    
      );
    }

    async saveProduct(product) {
      return product.save();
    }

    async removeTemplateReferences(userId, templateId) {
      return Product.updateMany(
        { owner: userId },
        {
          $pull: {
            templates: { templateId },
            secondMessages: { templateId },
            'variations.$[].templates': { templateId },
          },
        }
      );
    }

    async deleteProduct(productId, userId){
        const product = await Product.findOneAndDelete({ id: productId, owner: userId });

        return product;
    };
}

export const productsDAO = new ProductDAO()
