const Color = require("../models/Color.model");

/* -------------------------------- GET ----------------------------- */
const getColors = async (req, res) => {
  try {
    const colors = await Color.find().lean();
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
    const color = await Color.findById({ _id: id })
      .lean();
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
    const { name, mode, value } = req.body;
    if (!name || !mode || !value) {
      return res
        .status(200)
        .json({ success: false, message: "Color not found" });
    }
    const slug = (name ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
      .replace(/\s+/g, "-")         // spaces → hyphen
      .replace(/-+/g, "-")          // multiple hyphens → single
      .replace(/^-|-$/g, "");    // trim leading/trailing -


    const color = await Color.create({
      name,
      slug,
      mode,
      value,
      isActive: true,
    });

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
    const { name, mode, value, isActive } = req.body;

    const colorData = await Color.findById({ _id: id }).lean();
    if (!colorData) {
      return res
        .status(200)
        .json({ success: false, message: "Color not found" });
    }

    const slug = name ? (name ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
      .replace(/\s+/g, "-")         // spaces → hyphen
      .replace(/-+/g, "-")          // multiple hyphens → single
      .replace(/^-|-$/g, "")    // trim leading/trailing -
      : colorData?.slug;

    const color = await Color.findByIdAndUpdate(
      { _id: id },
      { name, slug, mode, value, isActive }
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
    const color = await Color.findOneAndDelete({ _id: id });

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
    const color = await Color.deleteMany({ _id: { $in: ids } });

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
