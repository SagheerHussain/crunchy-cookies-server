const mongoose = require('mongoose');

const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded', 'partial'];
const CUSTOMER_SATISFACTION = ['poor', 'extremely satisfied', 'satisfied', 'very poor']

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // human readable e.g. SA-2025-000123
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ORDER_STATUS, default: 'pending' },
    payment: { type: String, enum: PAYMENT_STATUS, default: 'pending' },
    items: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' },
    totalItems: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    appliedCoupon: { type: String },
    shippingAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    deliveryInstructions: { type: String, default: null },
    cardMessage: { type: String, default: null },
    cardImage: { type: String, default: null },
    taxAmount: { type: Number, default: 0 },
    placedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelReason: { type: String, default: null },
    satisfaction: { type: String, default: null, enum: CUSTOMER_SATISFACTION },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
