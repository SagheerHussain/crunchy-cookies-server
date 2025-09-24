const Order = require("../models/Order.model");

/* -------------------------------- GET ----------------------------- */
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user")
      .populate("items")
      .populate("appliedCoupon")
      .populate("shippingAddress")
      .lean();
    if (orders.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Orders not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Orders found successfully",
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById({ _id: id })
      .populate("user")
      .populate("items")
      .populate("appliedCoupon")
      .populate("shippingAddress")
      .lean();
    if (!order) {
      return res
        .status(200)
        .json({ success: false, message: "Order not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Order found successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ user: userId })
      .populate("user")
      .populate("items")
      .populate("appliedCoupon")
      .populate("shippingAddress")
      .lean();
    if (!orders) {
      return res
        .status(200)
        .json({ success: false, message: "Orders not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Orders found successfully",
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createOrder = async (req, res) => {
  try {
    const {
        code,
        user,
        status,
        items,
        totalItems,
        totalAmount,
        appliedCoupon,
        shippingAddress,
        deliveryInstructions,
        cardMessage,
        cardImage,
        taxAmount,
        placedAt,
    } = req.body;

    if (
      !code ||
      !user ||
      !items ||
      !appliedCoupon ||
      !shippingAddress ||
      !deliveryInstructions ||
      !cardMessage ||
      !cardImage ||
      !placedAt 
    ) {
      return res
        .status(200)
        .json({ success: false, message: "Order not found" });
    }

    const order = await Order.create({
      code,
      user,
      items,
      status,
      totalItems,
      totalAmount,
      appliedCoupon,
      shippingAddress,
      deliveryInstructions,
      cardMessage,
      cardImage,
      taxAmount: taxAmount || 0,
      placedAt,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      user,
      status,
      items,
      totalItems,
      totalAmount,
      appliedCoupon,
      shippingAddress,
      deliveryInstructions,
      cardMessage,
      cardImage,
      taxAmount,
      confirmedAt,
      deliveredAt,
      cancelReason,
    } = req.body;
    const order = await Order.findByIdAndUpdate(
      { _id: id },
      {
        code,
        user,
        status,
        items,
        totalItems,
        totalAmount,
        appliedCoupon,
        shippingAddress,
        deliveryInstructions,
        cardMessage,
        cardImage,
        taxAmount,
        confirmedAt,
        deliveredAt,
        cancelReason,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Order deleted successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const order = await Order.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Order deleted successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  getOrdersByUser,
  createOrder,
  updateOrder,
  deleteOrder,
  bulkDelete,
};
