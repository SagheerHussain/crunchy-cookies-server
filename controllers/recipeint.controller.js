const Recipient = require("../models/Recipient.model");
const cloudinary = require("../config/cloudinary");

/* -------------------------------- GET ----------------------------- */
const getRecipients = async (req, res) => {
  try {
    const recipients = await Recipient.find()
      .lean();
    if (recipients.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Recipients not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Recipients found successfully",
      data: recipients,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getRecipientById = async (req, res) => {
  try {
    const { id } = req.params;
    const recipient = await Recipient.findById({ _id: id })
      .lean();
    if (!recipient) {
      return res
        .status(200)
        .json({ success: false, message: "Recipient not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Recipient found successfully",
      data: recipient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createRecipient = async (req, res) => {
  try {
    const {
      name,
      ar_name,
    } = req.body;

    if (
      !name,
      !ar_name
    ) {
      return res
        .status(200)
        .json({ success: false, message: "All fields are required" });
    }

    const slug = (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
    .replace(/\s+/g, "-")         // spaces → hyphen
    .replace(/-+/g, "-")          // multiple hyphens → single
    .replace(/^-|-$/g, "")    // trim leading/trailing -

    const image = req.file.path;
    
    const cloudinaryResponse = await cloudinary.uploader.upload(image, {
      folder: "CRUNCHY COOKIES ASSETS",
    });
    
    const createRecipient = await Recipient.create({
      name,
      ar_name,
      slug,
      image: cloudinaryResponse.secure_url,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Recipient created successfully",
      data: createRecipient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateRecipient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      ar_name,
      isActive,
    } = req.body;

    const image = req.file.path;
    let cloudinaryResponse;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      cloudinaryResponse = cloudinaryResponse.secure_url;
    }

    const recipientData = await Recipient.findById({ _id: id })
      .lean();
    if (!recipientData) {
      return res
        .status(200)
        .json({ success: false, message: "Recipient not found" });
    }

    const slug = name ? (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // non-alphanumerics remove
    .replace(/\s+/g, "-")         // spaces → hyphen
    .replace(/-+/g, "-")          // multiple hyphens → single
    .replace(/^-|-$/g, "")    // trim leading/trailing -
    : recipientData?.slug;

    const updateRecipient = await Recipient.findByIdAndUpdate(
      { _id: id },
      {
        name,
        ar_name,
        slug,
        image: cloudinaryResponse ? cloudinaryResponse.secure_url : recipientData.image,
        isActive,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Recipient updated successfully",
      data: updateRecipient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteRecipient = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRecipient = await Recipient.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Recipient deleted successfully",
      data: deleteRecipient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const deleteRecipient = await Recipient.deleteMany({
      _id: { $in: ids },
    });

    return res.status(201).json({
      success: true,
      message: "Recipient deleted successfully",
      data: deleteRecipient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getRecipients,
  getRecipientById,
  createRecipient,
  updateRecipient,
  deleteRecipient,
  bulkDelete,
};
