const mongoose = require("mongoose");

const AVAILABILITY = ['in_stock', 'low_stock', 'out_of_stock'];

const CURRENCIES = ['QAR', 'USD'];

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    ar_title: { type: String, required: true, trim: true },
    description: { type: String },
    ar_description: { type: String },
    qualities: [{ type: String }],
    ar_qualities: [{ type: String }],
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    priceAfterDiscount: { type: Number, default: 0 },
    currency: { type: String, enum: CURRENCIES, default: "QAR" },
    totalStocks: { type: Number, required: true },
    remainingStocks: { type: Number, required: true },
    totalPieceSold: { type: Number, default: 0 },
    stockStatus: { type: String, enum: AVAILABILITY, default: "in_stock" },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },

    categories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", index: true }
    ],

    // existing type field (CategoryType refs)
    type: [
      { type: mongoose.Schema.Types.ObjectId, ref: "CategoryType", index: true }
    ],

    typePieces: [
      {
        type: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CategoryType",
          required: true,
          index: true,
        },
        pieces: { type: Number, required: true, min: 0 },
      },
    ],

    // total pieces (usually sum of typePieces.pieces)
    totalPieceCarry: { type: Number, default: 0 },

    occasions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Occasion", index: true }
    ],
    recipients: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Recipient", index: true }
    ],
    colors: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Color", index: true }
    ],
    packagingOption: { type: mongoose.Schema.Types.ObjectId, ref: "Packaging" },
    condition: { type: String, enum: ["new", "used"], default: "new" },
    featuredImage: { type: String },
    images: [
      {
        url: { type: String, required: true },
      },
    ],
    suggestedProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" }
    ],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sku: { type: String, required: true, unique: true },
    dimensions: {
      width: { type: Number },
      height: { type: Number },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
