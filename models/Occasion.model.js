const mongoose = require("mongoose");

const occasionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Happy Birthday, Get Well Soon
    slug: { type: String, required: true, lowercase: true, unique: true },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Occasion = mongoose.model("Occasion", occasionSchema);

module.exports = Occasion;
