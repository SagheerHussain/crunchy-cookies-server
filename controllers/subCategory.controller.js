const SubCategory = require("../models/SubCategory.model");
const cloudinary = require("../config/cloudinary");

/* -------------------------------- GET ----------------------------- */
const getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate("parent").lean();
    if (subCategories.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "SubCategories not found" });
    }
    return res.status(200).json({
      success: true,
      message: "SubCategories found successfully",
      data: subCategories,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await SubCategory.findById({ _id: id }).lean();
    if (!subCategory) {
      return res
        .status(200)
        .json({ success: false, message: "SubCategory not found" });
    }
    return res.status(200).json({
      success: true,
      message: "SubCategory found successfully",
      data: subCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createSubCategory = async (req, res) => {
  try {
    const { name, slug, parent } = req.body;

    if (!name || !slug || !parent) {
      return res
        .status(200)
        .json({ success: false, message: "SubCategory not found" });
    }

    const image = req.file.path;
   
    const cloudinaryResponse = await cloudinary.uploader.upload(image, {
      folder: "CRUNCHY COOKIES ASSETS",
    });

    const subCategory = await SubCategory.create({ name, slug, parent, image: cloudinaryResponse.secure_url, isActive: true });

    return res.status(201).json({
      success: true,
      message: "SubCategory created successfully",
      data: subCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, parent, isActive } = req.body;

    const image = req.file.path;
    let cloudinaryResponse;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      cloudinaryResponse = cloudinaryResponse.secure_url;
    }

    const subCategoryData = await SubCategory.findById({ _id: id })
      .lean();
    if (!subCategoryData) {
      return res
        .status(200)
        .json({ success: false, message: "SubCategory not found" });
    }

    const subCategory = await SubCategory.findByIdAndUpdate(
      { _id: id },
      { name, slug, parent, image: cloudinaryResponse ? cloudinaryResponse.secure_url : subCategoryData.image, isActive }
    );

    return res.status(201).json({
      success: true,
      message: "SubCategory updated successfully",
      data: subCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await SubCategory.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "SubCategory deleted successfully",
      data: subCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const subCategory = await SubCategory.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "SubCategories deleted successfully",
      data: subCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  bulkDelete,
};