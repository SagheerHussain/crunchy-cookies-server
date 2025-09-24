const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productItem: { type: mongoose.Schema.Types.ObjectId, ref: "ProductItem", required: true },
    qty: { type: Number, required: true, min: 1 }
  },
  { timestamps: true }
);

const CartItem = mongoose.model("CartItem", cartItemSchema);
