const mongoose = require("mongoose");

const COLOR_MODE = ['hex', 'rgb'];

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Red, Pink, White, Gold
    mode: { type: String, enum: COLOR_MODE, default: "hex" },
    value: { type: String, required: true, trim: true }, // '#FF0000' or '255,0,0'
    slug: { type: String, required: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Color = mongoose.model("Color", colorSchema);

module.exports = Color;
