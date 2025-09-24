const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    total_items: { type: Number, default: 0 },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: "CartItem" }],
    deliveryCharges: { type: Number, default: 0 },
},
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
