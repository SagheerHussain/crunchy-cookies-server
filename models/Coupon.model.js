// models/Coupon.model.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true }, // e.g. SAVE10
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true }, // percent (e.g. 10) or fixed amount (e.g. 500)
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 }, // 0 = no cap
    maxUsesTotal: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    maxUsesPerUser: { type: Number, default: 0 }, // 0 = unlimited
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
