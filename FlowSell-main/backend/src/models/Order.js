import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  itemId: { type: String },
  title: { type: String },
  quantity: { type: Number },
  unitPrice: { type: Number },
  totalAmount: { type: Number },
});

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sellerId: { type: String, index: true },
  buyerId: { type: String },
  packId: { type: String },
  items: [OrderItemSchema],
  orderDate: { type: Date },
  totalAmount: { type: Number, default: 0 },
  currencyId: { type: String, default: 'ARS' },
  status: { type: String, default: 'paid' },
  createdAt: { type: Date, default: Date.now },
});

OrderSchema.index({ sellerId: 1, orderId: 1 }, { unique: true });

const Order = mongoose.model('Order', OrderSchema);

export default Order;
