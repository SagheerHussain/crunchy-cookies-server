const PaymentMethod = require("../models/PaymentMethod.model");

/* -------------------------------- GET ----------------------------- */
const getPaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.find()
      .lean();
    if (paymentMethod.length === 0) {
      return res
        .status(200)    
        .json({ success: false, message: "Payment Method not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Payment Method found successfully",
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getPaymentMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentMethod = await PaymentMethod.findById({ _id: id })
      .lean();
    if (!paymentMethod) {
      return res
        .status(200)
        .json({ success: false, message: "Payment Method not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Payment Method found successfully",
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


/* -------------------------------- POST ----------------------------- */
const createPaymentMethod = async (req, res) => {
  try {
    const {
      name,
      slug,
      feeMinor,
    } = req.body;

    if (!name || !slug || !feeMinor) {
      return res
        .status(200)
        .json({ success: false, message: "Payment Method not found" });
    }

    const paymentMethod = await PaymentMethod.create({
      name,
      slug,
      feeMinor,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Payment Method created successfully",
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      feeMinor,
      isActive,
    } = req.body;

    const paymentMethod = await PaymentMethod.findByIdAndUpdate(
      { _id: id },
      {
        name,
        slug,
        feeMinor,
        isActive,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Payment Method updated successfully",
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentMethod = await PaymentMethod.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Payment Method deleted successfully",
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const paymentMethod = await PaymentMethod.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Payment Method deleted successfully",
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPaymentMethod,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  bulkDelete,
};
