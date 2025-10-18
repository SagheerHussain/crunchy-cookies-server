const mongoose = require("mongoose");

const orderHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    at: { type: Date, default: Date.now },
    notes: { type: String },
    ar_notes: { type: String },
  },
  { timestamps: true }
);

const OrderHistory = mongoose.model("OrderHistory", orderHistorySchema);
module.exports = OrderHistory;
