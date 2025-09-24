const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, lowercase: true, unique: true },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
        image: String,
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

subCategorySchema.index({ parent: 1 });

const SubCategory = mongoose.model("SubCategory", subCategorySchema);

module.exports = SubCategory;