const Address = require("../models/Address.model");

/* -------------------------------- GET ----------------------------- */
const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find().lean();
    if (addresses.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Addresses not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Addresses found successfully",
      data: addresses,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findById({ _id: id }).lean();
    if (!address) {
      return res
        .status(200)
        .json({ success: false, message: "Address not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Address found successfully",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createAddress = async (req, res) => {
  try {
    const { senderPhone, receiverPhone } = req.body;

    if (!senderPhone || !receiverPhone) {
      return res
        .status(200)
        .json({ success: false, message: "Address not found" });
    }

    const address = await Address.create({ senderPhone, receiverPhone });

    return res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { senderPhone, receiverPhone } = req.body;
    const address = await Address.findByIdAndUpdate(
      { _id: id },
      { senderPhone, receiverPhone }
    );

    return res.status(201).json({
      success: true,
      message: "Address updated successfully",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Address deleted successfully",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const address = await Address.deleteMany({});

    return res.status(201).json({
      success: true,
      message: "Addresses deleted successfully",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  bulkDelete,
};