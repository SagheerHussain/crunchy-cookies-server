const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Apple Pay, Cash on Delivery
    ar_name: { type: String, required: true }, // Apple Pay, Cash on Delivery
    slug: { type: String, required: true, lowercase: true, unique: true },
    isActive: { type: Boolean, default: true },
    feeMinor: { type: Number, default: 0 }, // gateway/service fee if any
  },
  { timestamps: true }
);

const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);

module.exports = PaymentMethod;
