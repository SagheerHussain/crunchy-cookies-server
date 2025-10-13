const mongoose = require("mongoose");

const packagingSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true }, // e.g. "Vase", "Box", "Basket", "Wrapping"
        slug: { type: String, required: true, lowercase: true },
        materials: [{ type: String, trim: true }], // paper, glass, acrylic, velvet
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);


const Packaging = mongoose.model("Packaging", packagingSchema);

module.exports = Packaging;