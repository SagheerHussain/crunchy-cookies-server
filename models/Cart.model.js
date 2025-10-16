// models/Cart.js
const mongoose = require("mongoose");

const cartLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    qty: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    items: { type: [cartLineSchema], default: [] },
  },
  { timestamps: true }
);

// (optional) virtual to compute total items
cartSchema.virtual("total_items").get(function () {
  return this.items.reduce((s, i) => s + i.qty, 0);
});

module.exports = mongoose.model("Cart", cartSchema);
