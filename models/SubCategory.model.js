const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        ar_name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, lowercase: true, unique: true },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
        image: String,
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const SubCategory = mongoose.model("SubCategory", subCategorySchema);

module.exports = SubCategory;