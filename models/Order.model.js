const mongoose = require('mongoose');

const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // human readable e.g. SA-2025-000123
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ORDER_STATUS, default: 'pending' },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }],
    totalItems: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    appliedCoupon: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }],
    shippingAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    deliveryInstructions: { type: String, default: null },
    cardMessage: { type: String, default: null },
    cardImage: { type: String, default: null },
    taxAmount: { type: Number, default: 0 },
    placedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelReason: { type: String, default: null },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
