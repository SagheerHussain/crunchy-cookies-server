const Packaging = require("../models/Packaging.model");

/* -------------------------------- GET ----------------------------- */
const getPackaging = async (req, res) => {
  try {
    const packaging = await Packaging.find()
      .lean();
    if (packaging.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Packaging not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Packaging found successfully",
      data: packaging,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getPackagingById = async (req, res) => {
  try {
    const { id } = req.params;
    const packaging = await Packaging.findById({ _id: id })
      .lean();
    if (!packaging) {
      return res
        .status(200)
        .json({ success: false, message: "Packaging not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Packaging found successfully",
      data: packaging,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


/* -------------------------------- POST ----------------------------- */
const createPackaging = async (req, res) => {
  try {
    const {
      name,
      materials,
    } = req.body;

    if (!name || !materials) {
      return res
        .status(200)
        .json({ success: false, message: "Packaging not found" });
    }

    const slug = (name ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
      .replace(/\s+/g, "-")         // spaces → hyphen
      .replace(/-+/g, "-")          // multiple hyphens → single
      .replace(/^-|-$/g, "");    // trim leading/trailing -

    console.log(name, slug, materials)

    const packaging = await Packaging.create({
      name,
      slug,
      materials,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Packaging created successfully",
      data: packaging,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updatePackaging = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      materials,
      isActive,
    } = req.body;

    const packagingData = Packaging.findById({ _id: id });

    const slug = name ? (name ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
      .replace(/\s+/g, "-")         // spaces → hyphen
      .replace(/-+/g, "-")          // multiple hyphens → single
      .replace(/^-|-$/g, "")   // trim leading/trailing -
      :
      packagingData?.slug;

    const packaging = await Packaging.findByIdAndUpdate(
      { _id: id },
      {
        name,
        slug,
        materials,
        isActive,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Packaging updated successfully",
      data: packaging,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deletePackaging = async (req, res) => {
  try {
    const { id } = req.params;
    const packaging = await Packaging.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Packaging deleted successfully",
      data: packaging,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const packaging = await Packaging.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Packaging deleted successfully",
      data: packaging,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPackaging,
  getPackagingById,
  createPackaging,
  updatePackaging,
  deletePackaging,
  bulkDelete,
};
