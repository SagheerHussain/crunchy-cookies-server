const mongoose = require("mongoose");

const GENDER = ["male", "female", "other"];

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, index: true },
    password: { type: String, required: true }, // store hash only
    gender: { type: String, enum: GENDER },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
    dob: { type: Date },
    lastLoginAt: { type: Date },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Role || mongoose.model("User", userSchema);

 
