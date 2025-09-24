const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, lowercase: true, unique: true },
        image: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

categorySchema.index({ slug: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;