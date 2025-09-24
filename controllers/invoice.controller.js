const Invoice = require("../models/Invoice.model");

/* -------------------------------- GET ----------------------------- */
const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().populate("users").populate("order").populate("payment").lean();
    if (invoices.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Invoices not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Invoices found successfully",
      data: invoices,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById({ _id: id }).populate("users").populate("order").populate("payment").lean();
    if (!invoice) {
      return res
        .status(200)
        .json({ success: false, message: "Invoice not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Invoice found successfully",
      data: invoice,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getInvoiceByUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const invoice = await Invoice.findById({ user: userId }).populate("users").populate("order").populate("payment").lean();
      if (!invoice) {
        return res
          .status(200)
          .json({ success: false, message: "Invoice not found" });
      }
      return res.status(200).json({
        success: true,
        message: "Invoice found successfully",
        data: invoice,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  };

/* -------------------------------- POST ----------------------------- */
const createInvoice = async (req, res) => {
  try {
    const { user, order, invoiceNumber, issueDate, payment, paymentStatus, paymentGatewayFee, url } = req.body;

    if (!user || !order || !invoiceNumber || !issueDate || !payment || !paymentStatus || !paymentGatewayFee || !url) {
      return res
        .status(200)
        .json({ success: false, message: "Invoice not found" });
    }

    const invoice = await Invoice.create({ user, order, invoiceNumber, issueDate, payment, paymentStatus, paymentGatewayFee, url });

    return res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, order, invoiceNumber, issueDate, payment, paymentStatus, paymentGatewayFee, url } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      { _id: id },
      { user, order, invoiceNumber, issueDate, payment, paymentStatus, paymentGatewayFee, url }
    );

    return res.status(201).json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Invoice deleted successfully",
      data: invoice,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const invoice = await Invoice.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Invoice deleted successfully",
      data: invoice,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  getInvoiceByUser,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  bulkDelete,
};