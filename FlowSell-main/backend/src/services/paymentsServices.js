import Order from "../models/Order.js";

export const saveOrderServices = async (result, user) => {
    try{
        const items = (result.items || []).map((item) => ({
          itemId: item.item?.id || item.itemId,
          title: item.item?.title || item.title,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unit_price ?? item.unitPrice) || 0,
          totalAmount: (Number(item.quantity) || 0) * (Number(item.unit_price ?? item.unitPrice) || 0),
        }));
        return await Order.findOneAndUpdate(
          { orderId: String(result.orderId), sellerId: String(user.meliId) },
          {
            orderId: String(result.orderId),
            owner: user._id,
            sellerId: String(user.meliId),
            buyerId: String(result.buyerId),
            packId: result.packId ? String(result.packId) : null,
            items,
            orderDate: result.orderDate,
            totalAmount: Number(result.totalAmount) || items.reduce((sum, item) => sum + item.totalAmount, 0),
            currencyId: result.currencyId || 'ARS',
            status: result.status || 'paid',
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
      console.error('Error al guardar la orden:', error.message);
      throw error;
    }
}


export const checkExistingOrder = async (result, sellerId) => {
    try {
        
        const orderId = result.orderId;

        if (!orderId) {
            throw new Error('No se encontró un ID de orden válido.');
        }

        const existingOrder = await Order.findOne({ orderId: String(orderId), sellerId: String(sellerId) });

        if (existingOrder) {
            console.log(`Orden ${orderId} ya existe en la base de datos.`);
            return true; 
        }

        return false; 
    } catch (error) {
        console.error('Error al verificar la orden:', error.message);
        throw error; 
    }
};
