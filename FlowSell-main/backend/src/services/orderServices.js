import { templatesDao } from "../DAO/templateDao.js";

class OrderServices{
    async getTemplatesServices(){

        const order = await templatesDao.getTemplates();

        if (!order) {
          throw new Error('Orden no encontrada.')
        }

        return order;
    };

}

export const orderServices = new OrderServices()

