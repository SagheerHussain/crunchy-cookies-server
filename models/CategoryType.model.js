const mongoose = require("mongoose");

const categoryTypeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, lowercase: true },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
        image: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const CategoryType = mongoose.model("CategoryType", categoryTypeSchema);

module.exports = CategoryType;