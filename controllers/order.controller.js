const mongoose = require("mongoose");
const Order = require("../models/Order.model");
const OrderItem = require("../models/OrderItems.model");
const Coupon = require("../models/Coupon.model");
const Address = require("../models/Address.model");
const { pushOrderToSheet } = require('../services/orderToSheet');

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

const ORDER_STATUS = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

/* -------------------------------- GET ----------------------------- */
const getOrders = async (req, res) => {
  try {
    const { status, from, to } = req.query;

    const where = {};

    // Status filter (skip if "all" or invalid)
    if (status && ORDER_STATUS.includes(String(status).toLowerCase())) {
      where.status = String(status).toLowerCase();
    }

    // Date range filter on placedAt
    if (from || to) {
      where.placedAt = {};
      if (from) where.placedAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999); // inclusive
        where.placedAt.$lte = end;
      }
    }

    const orders = await Order.find(where)
      .populate("user", "firstName lastName email")
      .populate("shippingAddress")
      .populate({
        path: "items",
        populate: { path: "products", model: "Product" },
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Orders fetched",
      data: orders || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById({ _id: id })
      .populate("user", "firstname lastname email") // choose fields
      .populate("appliedCoupon", "code type value")
      .populate("shippingAddress")
      .populate({
        path: "items", // 1st level: OrderItem docs
        populate: {
          path: "products", // 2nd level: Product docs inside each item
          model: "Product",
        },
      })
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
      items, // order-items
      totalItems,
      totalAmount,
      appliedCoupon,
      shippingAddress, // address
      deliveryInstructions,
      ar_deliveryInstructions,
      cardMessage,
      ar_cardMessage,
      cardImage,
      taxAmount,
    } = req.body;

    if (!user || !items || !totalItems || !totalAmount || !shippingAddress) {
      return res.status(403).json({
        success: false,
        message: "Please provide complete order details",
      });
    }

    console.log("items", req.body);

    const orderItems = await OrderItem.create(items);
    const address = await Address.create(shippingAddress);

    if (orderItems && address) {
      const placeOrder = await Order.create({
        code,
        user,
        items: orderItems?._id,
        totalItems,
        totalAmount,
        appliedCoupon,
        shippingAddress: address?._id,
        deliveryInstructions,
        ar_deliveryInstructions,
        cardMessage,
        ar_cardMessage,
        cardImage,
        taxAmount,
      });

      pushOrderToSheet(
        await Order.findById(placeOrder._id)
          .populate("user", "firstName lastName email")
          .populate("shippingAddress")
          .populate({ path: "items", populate: { path: "products", model: "Product" } })
          .lean()
      ).catch(err => console.error("[Sheets:create] ", err?.response?.data || err));

      return res.status(200).json({
        success: true,
        message: "Order Placed Successfully",
        data: placeOrder,
      });
    } else throw new Error("Order failed");
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // ...existing fields
      status,
      confirmedAt,
      cancelReason,
      payment,
      satisfaction
    } = req.body;

    const order = await Order.findById({ _id: id });
    let orderItems, address;
    if (req.body.items) {
      orderItems = await OrderItem.findById(order?.items?._id);
    }
    if (req.body.shippingAddress) {
      address = await Address.findById(order?.shippingAddress?._id);
    }

    let deliveredAt = "";
    if (status === "delivered") {
      deliveredAt = Date.now();
    }

    const updated = await Order.findByIdAndUpdate(
      { _id: id },
      {
        // ...other fields you already send
        items: orderItems?._id,
        shippingAddress: address?._id,
        status,
        confirmedAt,
        deliveredAt,
        cancelReason,
        payment,
        satisfaction
      },
      { new: true }
    );

    const hydrated = await Order.findById(updated._id)
      .populate("user", "firstname lastname email")
      .populate("shippingAddress")
      .populate({ path: "items", populate: { path: "products", model: "Product" } })
      .lean();

    pushOrderToSheet(hydrated).catch(err => console.error("[Sheets:update] ", err?.response?.data || err));

    return res.status(200).json({ success: true, message: "Order Updated Successfully", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
