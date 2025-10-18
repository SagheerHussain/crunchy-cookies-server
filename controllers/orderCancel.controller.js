const OrderCancel = require("../models/OrderCancel.model");

/* -------------------------------- GET ----------------------------- */
const getOrdersCancel = async (req, res) => {
  try {
    const ordersCancel = await OrderCancel.find()
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
            {
              path: "appliedCoupon",
              model: "Coupon",
              select: "type code value",
            },
          ],
        },
      ])
      .lean();
    if (ordersCancel.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Orders Cancel not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Orders Cancel found successfully",
      data: ordersCancel,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOrderCancelById = async (req, res) => {
  try {
    const { id } = req.params;
    const orderCancel = await OrderCancel.findById({ _id: id })
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
            {
              path: "appliedCoupon",
              model: "Coupon",
              select: "type code value",
            },
          ],
        },
      ])
      .lean();
    if (!orderCancel) {
      return res
        .status(200)
        .json({ success: false, message: "Order Cancel not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Order Cancel found successfully",
      data: orderCancel,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getOrdersCancelByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const ordersCancel = await OrderCancel.find({ user: userId })
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
            {
              path: "appliedCoupon",
              model: "Coupon",
              select: "type code value",
            },
          ],
        },
      ])
      .lean();
    if (!ordersCancel) {
      return res
        .status(200)
        .json({ success: false, message: "Orders Cancel not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Orders Cancel found successfully",
      data: ordersCancel,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createOrderCancel = async (req, res) => {
  try {
    const {
      user,
      order,
      refundAmount,
      refundStatus,
      payment,
      paymentStatus,
      refundReason,
      ar_refundReason,
    } = req.body;

    if (
      !user ||
      !order ||
      !refundAmount ||
      !refundStatus ||
      !payment ||
      !paymentStatus ||
      !refundReason ||
      !ar_refundReason
    ) {
      return res
        .status(200)
        .json({ success: false, message: "Order Cancel not found" });
    }

    const orderCancel = await OrderCancel.create({
      user,
      order,
      refundAmount,
      refundStatus,
      payment,
      paymentStatus,
      refundReason,
      ar_refundReason,
    });

    return res.status(201).json({
      success: true,
      message: "Order Cancel created successfully",
      data: orderCancel,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateOrderCancel = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user,
      order,
      refundAmount,
      refundStatus,
      payment,
      paymentStatus,
      refundReason,
      ar_refundReason,
    } = req.body;

    const orderCancel = await OrderCancel.findByIdAndUpdate(
      { _id: id },
      {
        user,
        order,
        refundAmount,
        refundStatus,
        payment,
        paymentStatus,
        refundReason,
        ar_refundReason,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Order Cancel updated successfully",
      data: orderCancel,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteOrderCancel = async (req, res) => {
  try {
    const { id } = req.params;
    const orderCancel = await OrderCancel.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Order Cancel deleted successfully",
      data: orderCancel,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const orderCancel = await OrderCancel.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Order Cancel deleted successfully",
      data: orderCancel,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getOrdersCancel,
  getOrderCancelById,
  getOrdersCancelByUser,
  createOrderCancel,
  updateOrderCancel,
  deleteOrderCancel,
  bulkDelete,
};
