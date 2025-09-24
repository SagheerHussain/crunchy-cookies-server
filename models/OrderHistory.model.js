const mongoose = require("mongoose");

const orderHistorySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    at: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

const OrderHistory = mongoose.model("OrderHistory", orderHistorySchema);
module.exports = OrderHistory;
