const Category = require("../models/Category.model");

/* -------------------------------- GET ----------------------------- */
const getColors = async (req, res) => {
  try {
    const colors = await Category.find().lean();
    if (colors.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Colors not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Colors found successfully",
      data: colors,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getColorById = async (req, res) => {
  try {
    const { id } = req.params;
    const color = await Category.findById({ _id: id }).lean();
    if (!color) {
      return res
        .status(200)
        .json({ success: false, message: "Color not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Color found successfully",
      data: color,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createColor = async (req, res) => {
  try {
    const { name, mode, value, slug } = req.body;

    if (!name || !mode || !value || !slug) {
      return res
        .status(200)
        .json({ success: false, message: "Color not found" });
    }

    const color = await Category.create({ name, mode, value, slug, isActive: true });

    return res.status(201).json({
      success: true,
      message: "Color created successfully",
      data: color,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateColor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mode, value, slug, isActive } = req.body;
    const color = await Category.findByIdAndUpdate(
      { _id: id },
      { name, mode, value, slug, isActive }
    );

    return res.status(201).json({
      success: true,
      message: "Color updated successfully",
      data: color,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteColor = async (req, res) => {
  try {
    const { id } = req.params;
    const color = await Category.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Color deleted successfully",
      data: color,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const color = await Category.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Colors deleted successfully",
      data: color,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getColors,
  getColorById,
  createColor,
  updateColor,
  deleteColor,
  bulkDelete,
};