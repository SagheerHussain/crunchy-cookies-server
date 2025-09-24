const OrderItems = require("../models/OrderItems.model");

/* -------------------------------- GET ----------------------------- */
const getOrderItems = async (req, res) => {
  try {
    const orderItems = await OrderItems.find()
      .populate("products")
      .lean();
    if (orderItems.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Orders History not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Orders History found successfully",
      data: ordersHistory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOrderItemsById = async (req, res) => {
  try {
    const { id } = req.params;
    const orderItems = await OrderItems.findById({ _id: id })
      .populate("products")
      .lean();
    if (!orderItems) {
      return res
        .status(200)
        .json({ success: false, message: "Order Items not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Order Items found successfully",
      data: orderItems,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOrderItemsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orderItems = await OrderItems.find({ user: userId })
      .populate("order")
      .lean();
    if (!orderItems) {
      return res
        .status(200)
        .json({ success: false, message: "Order Items not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Order Items found successfully",
      data: ordersHistory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createOrderItems = async (req, res) => {
  try {
    const {
      products,
      quantity,
      avgDiscount,
      totalAmount,
    } = req.body;

    if (!products || !quantity || !totalAmount) {
      return res
        .status(200)
        .json({ success: false, message: "Order Items not found" });
    }

    const orderItems = await OrderItems.create({
      products,
      quantity,
      avgDiscount,
      totalAmount,
      at: Date.now(),
    });

    return res.status(201).json({
      success: true,
      message: "Order Items created successfully",
      data: orderItems,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      products,
      quantity,
      avgDiscount,
      totalAmount,
    } = req.body;

    const orderItems = await OrderItems.findByIdAndUpdate(
      { _id: id },
      {
        products,
        quantity,
        avgDiscount,
        totalAmount
      }
    );

    return res.status(201).json({
      success: true,
      message: "Order Items updated successfully",
      data: orderItems,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const orderItems = await OrderItems.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Order Items deleted successfully",
      data: orderItems,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const orderItems = await OrderItems.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Order Items deleted successfully",
      data: orderItems,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getOrderItems,
  getOrderItemsById,
  getOrderItemsByUser,
  createOrderItems,
  updateOrderItems,
  deleteOrderItems,
  bulkDelete,
};
