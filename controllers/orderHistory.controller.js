const OrderHistory = require("../models/OrderHistory.model");

/* -------------------------------- GET ----------------------------- */
const getOrdersHistory = async (req, res) => {
  try {
    const ordersHistory = await OrderHistory.find()
      .populate([
        {
          path: "user",
          select: "firstName lastName email phone role",
        },
        {
          path: "order",
          // pick only fields you need on Order
          select: "code status payment paymentStatus placedAt grandTotal taxAmount discountPercent shippingAddress items",
          populate: [
            {
              // Order.items -> OrderItem[]
              path: "items",
              model: "OrderItem",
              // NOTE: your schema has 'discountForProducts' (not 'avgDiscount')
              select: "quantity discountForProducts totalAmount products",
              populate: {
                // OrderItem.products -> Product
                path: "products",
                model: "Product",
                select: "title ar_title quantity featuredImage price",
              },
            },
            {
              path: "shippingAddress",
              model: "Address",
              select: "senderPhone receiverPhone city area addressLine1",
            },
          ],
        },
      ])
      .lean();
    if (ordersHistory.length === 0) {
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
const getOrderHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const orderHistory = await OrderHistory.findById({ _id: id })
      .populate([
        {
          path: "user",
          select: "firstName lastName email phone role",
        },
        {
          path: "order",
          // pick only fields you need on Order
          select: "code status payment paymentStatus placedAt grandTotal taxAmount discountPercent shippingAddress items",
          populate: [
            {
              // Order.items -> OrderItem[]
              path: "items",
              model: "OrderItem",
              // NOTE: your schema has 'discountForProducts' (not 'avgDiscount')
              select: "quantity discountForProducts totalAmount products",
              populate: {
                // OrderItem.products -> Product
                path: "products",
                model: "Product",
                select: "title ar_title quantity featuredImage price",
              },
            },
            {
              path: "shippingAddress",
              model: "Address",
              select: "senderPhone receiverPhone city area addressLine1",
            },
          ],
        },
      ])
      .lean();
    if (!orderHistory) {
      return res
        .status(200)
        .json({ success: false, message: "Order History not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Order History found successfully",
      data: orderHistory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOrdersHistoryByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const ordersHistory = await OrderHistory.find({ user: userId })
      .populate([
        {
          path: "user",
          select: "firstName lastName email phone role",
        },
        {
          path: "order",
          // pick only fields you need on Order
          select: "code status payment paymentStatus placedAt grandTotal taxAmount discountPercent shippingAddress items",
          populate: [
            {
              // Order.items -> OrderItem[]
              path: "items",
              model: "OrderItem",
              // NOTE: your schema has 'discountForProducts' (not 'avgDiscount')
              select: "quantity discountForProducts totalAmount products",
              populate: {
                // OrderItem.products -> Product
                path: "products",
                model: "Product",
                select: "title ar_title quantity featuredImage price",
              },
            },
            {
              path: "shippingAddress",
              model: "Address",
              select: "senderPhone receiverPhone city area addressLine1",
            },
          ],
        },
      ])
      .lean();
    if (!ordersHistory) {
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

/* -------------------------------- POST ----------------------------- */
const createOrderHistory = async (req, res) => {
  try {
    const {
      order,
      notes,
      ar_notes
    } = req.body;

    if (!order) {
      return res
        .status(200)
        .json({ success: false, message: "Order History not found" });
    }

    const orderHistory = await OrderHistory.create({
      order,
      at: Date.now(),
      notes,
      ar_notes
    });

    return res.status(201).json({
      success: true,
      message: "Order History created successfully",
      data: orderHistory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      order,
      notes,
      ar_notes
    } = req.body;

    const orderHistory = await OrderHistory.findByIdAndUpdate(
      { _id: id },
      {
        order,
        notes,
        ar_notes,
        at: Date.now(),
      }
    );

    return res.status(201).json({
      success: true,
      message: "Order History updated successfully",
      data: orderHistory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const orderHistory = await OrderHistory.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Order History deleted successfully",
      data: orderHistory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const orderHistory = await OrderHistory.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Order History deleted successfully",
      data: orderHistory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getOrdersHistory,
  getOrderHistoryById,
  getOrdersHistoryByUser,
  createOrderHistory,
  updateOrderHistory,
  deleteOrderHistory,
  bulkDelete,
};
