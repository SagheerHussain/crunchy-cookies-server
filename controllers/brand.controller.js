const Brand = require("../models/Brand.model");
const cloudinary = require("../config/cloudinary");

/* -------------------------------- GET ----------------------------- */
const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().lean();
    if (brands.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Brands not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Brands found successfully",
      data: brands,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById({ _id: id }).lean();
    if (!brand) {
      return res
        .status(200)
        .json({ success: false, message: "Brand not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Brand found successfully",
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createBrand = async (req, res) => {
  try {
    const { name, ar_name, countryCode } = req.body;

    if (!name || !ar_name) {
      return res
        .status(200)
        .json({ success: false, message: "Brand not found" });
    }

    const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: "CRUNCHY COOKIES ASSETS",
    });

    const slug =
      (name ?? "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
        .replace(/\s+/g, "-")         // spaces → hyphen
        .replace(/-+/g, "-")          // multiple hyphens → single
        .replace(/^-|-$/g, "");       // trim leading/trailing -

    const brand = await Brand.create({
      name,
      ar_name,
      slug,
      logo: cloudinaryResponse.secure_url,
      countryCode,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ar_name, countryCode, isActive } = req.body;

    let cloudinaryResponse;
    if (req.file) {
      cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      cloudinaryResponse = cloudinaryResponse.secure_url;
    }

    const brandData = await Brand.findById({ _id: id }).lean();
    if (!brandData) {
      return res
        .status(200)
        .json({ success: false, message: "Brand not found" });
    }

    const slug = name ? (name ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
      .replace(/\s+/g, "-")         // spaces → hyphen
      .replace(/-+/g, "-")          // multiple hyphens → single
      .replace(/^-|-$/g, "")    // trim leading/trailing -
      :
      brandData?.slug;

    const brand = await Brand.findByIdAndUpdate(
      { _id: id },
      { name, ar_name, slug, countryCode, logo: cloudinaryResponse ? cloudinaryResponse : brandData.logo, isActive }
    );

    return res.status(201).json({
      success: true,
      message: "Brand updated successfully",
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Brand deleted successfully",
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const brand = await Brand.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Brands deleted successfully",
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  bulkDelete,
};
