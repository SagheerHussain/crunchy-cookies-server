const mongoose = require("mongoose");

const orderCancelSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    refundAmount: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "paid" },
    refundReason: { type: String, default: null },
    ar_refundReason: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const OrderCancel = mongoose.model("OrderCancel", orderCancelSchema);
module.exports = OrderCancel;
