const Category = require("../models/Category.model");
const cloudinary = require("../config/cloudinary");

/* -------------------------------- GET ----------------------------- */
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().lean();
    if (categories.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Categories not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Categories found successfully",
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById({ _id: id }).lean();
    if (!category) {
      return res
        .status(200)
        .json({ success: false, message: "Category not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Category found successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res
        .status(200)
        .json({ success: false, message: "Category not found" });
    }

    const slug =
      (name ?? "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
        .replace(/\s+/g, "-")         // spaces → hyphen
        .replace(/-+/g, "-")          // multiple hyphens → single
        .replace(/^-|-$/g, "");       // trim leading/trailing -

    const image = req.file.path;
    let cloudinaryResponse;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      cloudinaryResponse = cloudinaryResponse.secure_url;
    }

    console.log(name, req.file, slug);

    const category = await Category.create({ name, slug, image: cloudinaryResponse, isActive: true });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    let cloudinaryResponse = "";
    if (req.file) {
      cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      cloudinaryResponse = cloudinaryResponse.secure_url;
    }

    const categoryData = await Category.findById({ _id: id }).lean();
    if (!categoryData) {
      return res
        .status(200)
        .json({ success: false, message: "Category not found" });
    }

    const slug = name ? (name ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
      .replace(/\s+/g, "-")         // spaces → hyphen
      .replace(/-+/g, "-")          // multiple hyphens → single
      .replace(/^-|-$/g, "")    // trim leading/trailing -
      :
      categoryData?.slug;

    const category = await Category.findByIdAndUpdate(
      { _id: id },
      { name, slug, image: cloudinaryResponse ? cloudinaryResponse : categoryData.image, isActive }
    );

    return res.status(201).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Category deleted successfully",
      data: category,
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
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkDelete,
};