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
    const { name, slug, parent } = req.body;

    if (!name || !slug || !parent) {
      return res
        .status(200)
        .json({ success: false, message: "Category Type not found" });
    }

    const image = req.file.path;

    const cloudinaryResponse = await cloudinary.uploader.upload(image, {
      folder: "CRUNCHY COOKIES ASSETS",
    });

    const categoryType = await CategoryType.create({
      name,
      slug,
      parent,
      image: cloudinaryResponse.secure_url,
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
    const { name, slug, isActive } = req.body;

    const image = req.file.path;
    let cloudinaryResponse;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      cloudinaryResponse = cloudinaryResponse.secure_url;
    }
    const categoryTypeData = await CategoryType.findById({ _id: id }).lean();
    if (!categoryTypeData) {
      return res
        .status(200)
        .json({ success: false, message: "Category Type not found" });
    }

    const categoryType = await CategoryType.findByIdAndUpdate(
      { _id: id },
      { name, slug, image: cloudinaryResponse ? cloudinaryResponse : categoryTypeData.image, isActive }
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
