const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    quantity: { type: Number, default: 1 },
    avgDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const OrderItem = mongoose.model('OrderItem', orderItemSchema);
module.exports = OrderItem;
