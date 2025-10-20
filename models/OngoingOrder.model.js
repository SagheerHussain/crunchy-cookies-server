const mongoose = require("mongoose");

const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const ongoingOrderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        status: { type: String, enum: ORDER_STATUS, default: 'pending' },
        payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
        paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'paid' },
        at: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const OngoingOrder = mongoose.model("OngoingOrder", ongoingOrderSchema);
module.exports = OngoingOrder;
