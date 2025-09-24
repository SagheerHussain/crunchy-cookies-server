const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true }, // Mother, Father, Friend, Colleague, Kids
        slug: { type: String, required: true, lowercase: true, unique: true },
        image: { type: String },
        isActive: { type: Boolean, default: true },
      },
    { timestamps: true }
);

const Recipient = mongoose.model("Recipient", recipientSchema);

module.exports = Recipient;