const OngoingOrder = require("../models/OngoingOrder.model");

/* -------------------------------- GET ----------------------------- */
const getOngoingOrders = async (req, res) => {
  try {
    const ongoingOrders = await OngoingOrder.find().populate("user").populate("order").lean();
    if (ongoingOrders.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Ongoing orders not found" });
    }   
    return res.status(200).json({
      success: true,
      message: "Ongoing orders found successfully",
      data: ongoingOrders,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOngoingOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const ongoingOrder = await OngoingOrder.findById({ _id: id }).populate("user").populate("order").lean();
    if (!ongoingOrder) {
      return res
        .status(200)
        .json({ success: false, message: "Ongoing order not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Ongoing order found successfully",
      data: ongoingOrder,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOngoingOrderByUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const ongoingOrder = await OngoingOrder.find({ user: userId }).populate("user").populate("order").lean();
      if (!ongoingOrder) {
        return res
          .status(200)
          .json({ success: false, message: "Ongoing order not found" });
      }
      return res.status(200).json({
        success: true,
        message: "Ongoing order found successfully",
        data: ongoingOrder,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  };

/* -------------------------------- POST ----------------------------- */
const createOngoingOrder = async (req, res) => {
  try {
    const { user, order, status, payment, paymentStatus } = req.body;

    if (!user || !order || !status || !payment || !paymentStatus) {
      return res
        .status(200)
        .json({ success: false, message: "Ongoing order not found" });
    }

    const ongoingOrder = await OngoingOrder.create({ user, order, status, payment, paymentStatus, at: Date.now() });

    return res.status(201).json({
      success: true,
      message: "Ongoing order created successfully",
      data: ongoingOrder,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateOngoingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, order, status, payment, paymentStatus } = req.body;
    const ongoingOrder = await OngoingOrder.findByIdAndUpdate(
      { _id: id },
      { user, order, status, payment, paymentStatus, at: Date.now() }
    );

    return res.status(201).json({
      success: true,
      message: "Ongoing order updated successfully",
      data: ongoingOrder,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteOngoingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const ongoingOrder = await OngoingOrder.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Ongoing order deleted successfully",
      data: ongoingOrder,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const ongoingOrder = await OngoingOrder.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Ongoing order deleted successfully",
      data: ongoingOrder,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getOngoingOrders,
  getOngoingOrderById,
  getOngoingOrderByUser,
  createOngoingOrder,
  updateOngoingOrder,
  deleteOngoingOrder,
  bulkDelete,
};