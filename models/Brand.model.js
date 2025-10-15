const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ar_name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    logo: { type: String },
    countryCode: { type: String, default: "QAR" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Brand = mongoose.model("Brand", brandSchema);

module.exports = Brand;
