const mongoose = require('mongoose');

const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded', 'partial'];
const CUSTOMER_SATISFACTION = ['poor', 'extremely satisfied', 'satisfied', 'very poor'];

const orderRecipientSchema = new mongoose.Schema(
  {
    label: { type: String }, // e.g. "Recipient 1"
    name: { type: String },
    phone: { type: String, required: true },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    cardMessage: { type: String, default: null },
    cardImage: { type: String, default: null },
    deliveryInstructions: { type: String, default: null },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // core statuses
    status: { type: String, enum: ORDER_STATUS, default: 'pending' },
    payment: { type: String, enum: PAYMENT_STATUS, default: 'paid' },

    // items
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }],
    totalItems: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    appliedCoupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },

    // SENDER (single)
    senderPhone: { type: String, required: true },

    // MULTIPLE RECIPIENTS
    recipients: [orderRecipientSchema],

    // legacy / optional (for single-recipient simple orders, if needed)
    shippingAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },

    // If you now manage per-recipient messages, you can drop these later:
    deliveryInstructions: { type: String, default: null },
    ar_deliveryInstructions: { type: String, default: null },
    cardMessage: { type: String, default: null },
    ar_cardMessage: { type: String, default: null },
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
