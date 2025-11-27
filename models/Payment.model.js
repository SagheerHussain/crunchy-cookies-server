const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        sessionId: { type: String, required: true, trim: true }, // e.g. "Vase", "Box", "Basket", "Wrapping"
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // e.g. "Vase", "Box", "Basket", "Wrapping"
    },
    { timestamps: true }
);


const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;