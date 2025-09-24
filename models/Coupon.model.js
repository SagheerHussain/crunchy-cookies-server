const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
      code: { type: String, required: true, uppercase: true, unique: true },
      type: { type: String, enum: COUPON_TYPE, required: true },
      value: { type: Number, required: true }, // percentage (e.g. 10) or amountMinor for 'fixed'
      totalUsesLimit: { type: Number }, // optional global cap
      usedCount: { type: Number, default: 0 },
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      startAt: { type: Date, required: true },
      endAt: { type: Date, required: true },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
