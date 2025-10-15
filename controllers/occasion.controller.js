const Occasion = require("../models/Occasion.model");
const cloudinary = require("../config/cloudinary");

/* -------------------------------- GET ----------------------------- */
const getOccasions = async (req, res) => {
  try {
    const occasions = await Occasion.find().lean();
    if (occasions.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Occasions not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Occasions found successfully",
      data: occasions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOccasionById = async (req, res) => {
  try {
    const { id } = req.params;
    const occasion = await Occasion.findById({ _id: id }).lean();
    if (!occasion) {
      return res
        .status(200)
        .json({ success: false, message: "Occasion not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Occasion found successfully",
      data: occasion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createOccasion = async (req, res) => {
  try {
    const { name, ar_name } = req.body;

    if (!name || !ar_name) {
      return res
        .status(200)
        .json({ success: false, message: "Occasion not found" });
    }


    const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: "CRUNCHY COOKIES ASSETS",
    });

    const slug = (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
    .replace(/\s+/g, "-")         // spaces → hyphen
    .replace(/-+/g, "-")          // multiple hyphens → single
    .replace(/^-|-$/g, "")    // trim leading/trailing -

    const occasion = await Occasion.create({ name, ar_name, slug, image: cloudinaryResponse.secure_url, isActive: true });

    return res.status(201).json({
      success: true,
      message: "Occasion created successfully",
      data: occasion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ar_name, isActive } = req.body;

    let cloudinaryResponse;
    if (req.file) {
      cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      cloudinaryResponse = cloudinaryResponse.secure_url;
    }

    const occasionData = await Occasion.findById({ _id: id }).lean();
    if (!occasionData) {
      return res
        .status(200)
        .json({ success: false, message: "Occasion not found" });
    }

    const slug = name ? (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
    .replace(/\s+/g, "-")         // spaces → hyphen
    .replace(/-+/g, "-")          // multiple hyphens → single
    .replace(/^-|-$/g, "")    // trim leading/trailing -
    : occasionData?.slug

    const occasion = await Occasion.findByIdAndUpdate(
      { _id: id },
      { name, ar_name, slug, image: cloudinaryResponse ? cloudinaryResponse : occasionData.image, isActive }
    );

    return res.status(201).json({
      success: true,
      message: "Occasion updated successfully",
      data: occasion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    const occasion = await Occasion.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Occasion deleted successfully",
      data: occasion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const occasion = await Occasion.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Occasion deleted successfully",
      data: occasion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getOccasions,
  getOccasionById,
  createOccasion,
  updateOccasion,
  deleteOccasion,
  bulkDelete,
};