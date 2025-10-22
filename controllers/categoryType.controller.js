const CategoryType = require("../models/CategoryType.model");
const cloudinary = require("../config/cloudinary");

/* -------------------------------- GET ----------------------------- */
const getCategoryTypes = async (req, res) => {
  try {
    const categoryTypes = await CategoryType.find().populate("parent").lean();
    if (categoryTypes.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Category Types not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Category Types found successfully",
      data: categoryTypes,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getCategoryTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryType = await CategoryType.findById({ _id: id })
      .populate("parent")
      .lean();
    if (!categoryType) {
      return res
        .status(200)
        .json({ success: false, message: "Category Type not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Category Type found successfully",
      data: categoryType,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createCategoryType = async (req, res) => {
  try {
    const { name, ar_name, parent, totalStock, totalPieceUsed } = req.body;

    if (!name || !ar_name || !parent || !totalStock || !totalPieceUsed) {
      return res
        .status(200)
        .json({ success: false, message: "Category Type not found" });
    }
    const slug = (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
    .replace(/\s+/g, "-")         // spaces → hyphen
    .replace(/-+/g, "-")          // multiple hyphens → single
    .replace(/^-|-$/g, "");    // trim leading/trailing -


    const remainingStock = totalStock - totalPieceUsed;

    const categoryType = await CategoryType.create({
      name,
      ar_name,
      slug,
      parent,
      totalStock,
      remainingStock,
      totalPieceUsed,
      stockStatus: remainingStock > 0 ? "in_stock" : "out_of_stock",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Category Type created successfully",
      data: categoryType,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateCategoryType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ar_name, parent, isActive, totalStock, totalPieceUsed } = req.body;

    const categoryTypeData = await CategoryType.findById({ _id: id }).lean();
    if (!categoryTypeData) {
      return res
        .status(200)
        .json({ success: false, message: "Category Type not found" });
    }

    const slug = name ? (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
    .replace(/\s+/g, "-")         // spaces → hyphen
    .replace(/-+/g, "-")          // multiple hyphens → single
    .replace(/^-|-$/g, "")    // trim leading/trailing -
    : categoryTypeData?.slug;

    const remainingStock = totalStock - totalPieceUsed;

    const categoryType = await CategoryType.findByIdAndUpdate(
      { _id: id },
      { name, ar_name, slug, parent, isActive, totalStock, remainingStock, totalPieceUsed }
    );

    return res.status(201).json({
      success: true,
      message: "Category Type updated successfully",
      data: categoryType,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteCategoryType = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryType = await CategoryType.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Category Type deleted successfully",
      data: categoryType,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const category = await Category.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Categories deleted successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCategoryTypes,
  getCategoryTypeById,
  createCategoryType,
  updateCategoryType,
  deleteCategoryType,
  bulkDelete,
};
