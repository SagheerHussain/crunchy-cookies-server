// controllers/payment.controller.js
const Payment = require("../models/Payment.model");

const getPayment = async (req, res) => {
  try {
    const payments = await Payment.find().populate("userId");

    if (!payments.length) {
      return res.status(404).json({ message: "Payments not found" });
    }

    return res
      .status(200)
      .json({ data: payments, message: "Payments found", success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById({ _id: req.params.id }).populate(
      "userId"
    );

    if (!payment) {
      return res.status(200).json({ message: "Payment not found" });
    }

    return res
      .status(200)
      .json({ data: payment, message: "Payment found", success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getPaymentByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);
    const payment = await Payment.find({ userId }).populate("userId");
    console.log(payment);

    if (!payment || payment.length === 0) {
      return res.status(404).json({ message: "User Payment not found" });
    }

    return res
      .status(200)
      .json({ data: payment, message: "Payment found", success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const createPayment = async (req, res) => {
  try {
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res
        .status(400)
        .json({ message: "Session ID and User ID are required" });
    }

    // 🔴 check if this session is already stored
    const existing = await Payment.findOne({ sessionId, userId });

    if (existing) {
      return res.status(200).json({
        data: existing,
        message: "Payment already exists",
        success: true,
        alreadyExists: true,
      });
    }

    const payment = await Payment.create({ sessionId, userId });

    return res.status(201).json({
      data: payment,
      message: "Payment created",
      success: true,
      alreadyExists: false,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { sessionId, userId },
      { new: true }
    );
    return res
      .status(200)
      .json({ data: payment, message: "Payment updated", success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    return res
      .status(200)
      .json({ data: payment, message: "Payment deleted", success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const payments = await Payment.deleteMany({});
    return res
      .status(200)
      .json({ data: payments, message: "Payments deleted", success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPayment,
  getPaymentById,
  getPaymentByUserId, // 👈 yeh export karna mat bhoolna
  createPayment,
  updatePayment,
  deletePayment,
  bulkDelete,
};
