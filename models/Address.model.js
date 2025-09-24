const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
    {
        senderPhone: { type: String, required: true },
        receiverPhone: { type: String, required: true }
    },
    { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;