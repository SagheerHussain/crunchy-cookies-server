const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, unique: true },
    logo: { type: String },
    countryCode: { type: String, default: "QAR" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

brandSchema.index({ slug: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Brand = mongoose.model("Brand", brandSchema);

module.exports = Brand;
