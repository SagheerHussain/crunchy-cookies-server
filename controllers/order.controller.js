// controllers/order.controller.js
const mongoose = require("mongoose");
const Order = require("../models/Order.model");
const OrderItem = require("../models/OrderItems.model");
const Coupon = require("../models/Coupon.model");
const Address = require("../models/Address.model");
const Product = require("../models/Product.model");

// ⬇️ NEW imports
const OngoingOrder = require("../models/OngoingOrder.model");
const OrderHistory = require("../models/OrderHistory.model");
const OrderCancel = require("../models/OrderCancel.model");

const { pushOrderToSheet } = require("../services/orderToSheet");

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

const ORDER_STATUS = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];
const PAYMENT_STATUS = ["pending", "paid", "failed", "refunded", "partial"];

const money = (n) =>
  Math.max(0, Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100);

// ⬇️ NEW: keep the other collections in sync with the order's status
async function reflectOrderState(orderDocOrLean) {
  if (!orderDocOrLean) return;
  const order = orderDocOrLean.toObject ? orderDocOrLean.toObject() : orderDocOrLean;

  const orderId = order._id;
  const status = String(order.status || "").toLowerCase();

  const isOngoing  = ["pending", "confirmed", "shipped"].includes(status);
  const isHistory  = ["delivered", "cancelled", "returned"].includes(status);
  const isCanceled = ["cancelled", "returned"].includes(status);

  /* ------------------------ Ongoing Orders ------------------------ */
  if (isOngoing) {
    await OngoingOrder.findOneAndUpdate(
      { order: orderId },
      {
        $set: {
          user: order?.user?._id,
          status,
          paymentStatus: order.payment === "paid" ? "paid" : "pending",
        },
        $setOnInsert: {
          order: orderId,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  } else {
    await OngoingOrder.deleteOne({ order: orderId });
  }

  /* ------------------------ Order History ------------------------ */
  if (isHistory) {
    // Try update; if none matched, create manually
    const updated = await OrderHistory.findOneAndUpdate(
      { order: orderId },
      {
        $set: {
          user: order?.user?._id,
          status,
          notes: order.cardMessage || undefined,
          ar_notes: order.ar_cardMessage || undefined,
        },
      },
      { new: true }
    );

    if (!updated) {
      await OrderHistory.create({
        order: orderId,
        user: order?.user?._id,
        status,
        notes: order.cardMessage || undefined,
        ar_notes: order.ar_cardMessage || undefined,
        at: order.deliveredAt || new Date(),
      });
    }
  } else {
    await OrderHistory.deleteOne({ order: orderId });
  }

  /* ------------------------ Cancelled / Returned Orders ------------------------ */
  if (isCanceled) {
    const updatedCancel = await OrderCancel.findOneAndUpdate(
      { order: orderId },
      {
        $set: {
          user: order?.user?._id,
          refundReason: order.cancelReason || null,
          paymentStatus: order.payment === "paid" ? "paid" : "unpaid",
          status,
        },
      },
      { new: true }
    );

    if (!updatedCancel) {
      await OrderCancel.create({
        order: orderId,
        user: order?.user?._id,
        status,
        refundReason: order.cancelReason || null,
        paymentStatus: order.payment === "paid" ? "paid" : "unpaid",
        refundAmount: 0,
        at: new Date(),
      });
    }
  } else {
    await OrderCancel.deleteOne({ order: orderId });
  }
}

const validateCouponWindowAndLimits = async (
  { coupon, userId, subtotal },
  session
) => {
  if (!coupon) return "Invalid coupon";
  if (!coupon.isActive) return "Coupon is inactive";

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return "Coupon not started yet";
  if (coupon.endsAt && now > coupon.endsAt) return "Coupon expired";
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return `Minimum order amount is ${coupon.minOrderAmount}`;
  }
  if (coupon.maxUsesTotal && coupon.usedCount >= coupon.maxUsesTotal) {
    return "Total usage limit reached";
  }
  if (coupon.maxUsesPerUser && coupon.maxUsesPerUser > 0) {
    const usedTimes = await Order.countDocuments({
      user: userId,
      appliedCoupon: coupon._id,
      payment: { $in: ["paid", "partial"] },
    }).session(session);
    if (usedTimes >= coupon.maxUsesPerUser) {
      return "Per-user usage limit reached";
    }
  }
  return null;
};

const priceMapForProducts = async (items) => {
  const ids = items.map((it) => it.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids } })
    .select("_id price")
    .lean();
  return new Map(products.map((p) => [String(p._id), Number(p.price || 0)]));
};

/* -------------------------------- GET ----------------------------- */
const getOrders = async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const where = {};

    if (status && ORDER_STATUS.includes(String(status).toLowerCase())) {
      where.status = String(status).toLowerCase();
    }

    if (from || to) {
      where.placedAt = {};
      if (from) where.placedAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.placedAt.$lte = end;
      }
    }

    const orders = await Order.find(where)
      .populate("user", "firstName lastName email")
      .populate("appliedCoupon", "code type value")
      .populate("shippingAddress")
      .populate({
        path: "items",
        populate: { path: "products", model: "Product" }, // correct: products[]
      })
      .lean();

    return res
      .status(200)
      .json({ success: true, message: "Orders fetched", data: orders || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate("user", "firstName lastName email")
      .populate("appliedCoupon", "code type value")
      .populate("shippingAddress")
      .populate({
        path: "items",
        populate: { path: "products", model: "Product" },
      })
      .lean();
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Order fetched", data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ user: userId })
      .populate("user", "firstName lastName email")
      .populate("appliedCoupon", "code type value")
      .populate("shippingAddress")
      .populate({
        path: "items",
        populate: { path: "products", model: "Product" },
      })
      .lean();

    return res
      .status(200)
      .json({ success: true, message: "Orders fetched", data: orders || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
// Accepts either `couponCode` OR `appliedCoupon` (string code) in body
const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      code,
      user,
      items,
      shippingAddress,
      deliveryInstructions,
      ar_deliveryInstructions,
      cardMessage,
      ar_cardMessage,
      cardImage,
      taxAmount,
      couponCode: _couponCode,
      appliedCoupon: _appliedCoupon, // alias support for your existing frontend
    } = req.body;

    console.log(req.body)

    if (
      !code ||
      !user ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !shippingAddress
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Please provide complete order details",
      });
    }

    const userOngoingOrder = await OngoingOrder.findOne({ user });

    if (userOngoingOrder) {
      return res.status(200).json({ success: true, message: "Please place your order after delivered your current order." })
    }

    // 1) Build order items from product prices
    const prices = await priceMapForProducts(items);
    if (prices.size === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Invalid products in items" });
    }

    let subtotal = 0;
    let totalQty = 0;
    const orderItemDocs = [];

    for (const it of items) {
      const pid = String(it.product);
      const qty = Math.max(1, Number(it.quantity || 1));
      const unitPrice = Number(prices.get(pid) || 0);
      if (!unitPrice) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: "Invalid product in items" });
      }
      const lineSubtotal = unitPrice * qty;
      subtotal += lineSubtotal;
      totalQty += qty;

      // Match your OrderItems.model
      orderItemDocs.push({
        products: [it.product],
        quantity: qty,
        discountForProducts: 0,
        totalAmount: money(lineSubtotal),
      });
    }

    subtotal = money(subtotal);

    // 2) Coupon validation & compute discount
    let coupon = null;
    let discountAmount = 0;
    const incomingCoupon = (_couponCode || _appliedCoupon || "")
      .toString()
      .trim();

    if (incomingCoupon.length > 0) {
      coupon = await Coupon.findOne({
        code: incomingCoupon.toUpperCase(),
      }).session(session);
      const invalidMsg = await validateCouponWindowAndLimits(
        { coupon, userId: user, subtotal },
        session
      );
      if (invalidMsg) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: invalidMsg });
      }

      if (coupon.type === "percentage") {
        discountAmount = (subtotal * coupon.value) / 100;
        if (coupon.maxDiscount && coupon.maxDiscount > 0) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else {
        discountAmount = coupon.value;
      }
      discountAmount = money(discountAmount);
    }

    // 3) Tax & final totals
    const tax = money(Number(taxAmount || 0));
    const total = money(subtotal - discountAmount + tax);

    // 4) Persist order items & address
    const createdItems = await OrderItem.insertMany(orderItemDocs, { session });

    let addressId = null;
    if (isValidObjectId(shippingAddress)) {
      addressId = shippingAddress;
    } else {
      const createdAddress = await Address.create([shippingAddress], {
        session,
      });
      addressId = createdAddress[0]._id;
    }

    // 5) Create order
    const orderPayload = {
      code,
      user,
      items: createdItems.map((d) => d._id),
      totalItems: totalQty,
      subtotalAmount: subtotal,
      discountAmount,
      taxAmount: tax,
      grandTotal: total,
      appliedCoupon: coupon ? coupon._id : undefined,
      shippingAddress: addressId,
      deliveryInstructions,
      ar_deliveryInstructions,
      cardMessage,
      ar_cardMessage,
      cardImage,
      placedAt: new Date(),
      status: "pending",
      payment: "pending",
    };

    const [order] = await Order.create([orderPayload], { session });

    await session.commitTransaction();
    session.endSession();

    // hydrate using the CORRECT id variable (`order`, not `placeOrder`)
    const hydratedForSheet = await Order.findById(order._id)
      .populate("user", "firstName lastName email")
      .populate("appliedCoupon", "code type value")
      .populate("shippingAddress")
      .populate({
        path: "items",
        populate: { path: "products", model: "Product" },
      })
      .lean();

    // ⬇️ NEW: reflect status into Ongoing/History/Cancel
    try {
      await reflectOrderState(hydratedForSheet);
    } catch (err) {
      console.error("[Reflect:create] failed:", err?.message || err);
    }

    // fire-and-forget (but log real errors)
    pushOrderToSheet(hydratedForSheet).catch((err) => {
      console.error(
        "[Sheets:create]",
        err?.response?.data || err?.errors || err?.message || err
      );
    });

    return res.status(200).json({
      success: true,
      message: "Order Placed Successfully",
      data: order,
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {}
    session.endSession();
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    const updatable = [
      "status",
      "confirmedAt",
      "cancelReason",
      "payment",
      "satisfaction",
      "deliveryInstructions",
      "ar_deliveryInstructions",
      "cardMessage",
      "ar_cardMessage",
      "cardImage",
      "shippingAddress",
    ];

    const patch = {};
    for (const k of updatable) {
      if (Object.prototype.hasOwnProperty.call(req.body, k))
        patch[k] = req.body[k];
    }

    if (patch.status === "delivered") patch.deliveredAt = new Date();

    if (patch.shippingAddress && !isValidObjectId(patch.shippingAddress)) {
      const createdAddress = await Address.create([patch.shippingAddress], {
        session,
      });
      patch.shippingAddress = createdAddress[0]._id;
    }

    const current = await Order.findById(id).session(session);
    if (!current) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const paymentBefore = current.payment;
    const paymentAfter = patch.payment ?? paymentBefore;

    const updated = await Order.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
      session,
    });

    // record coupon usage after payment -> paid
    if (
      paymentBefore !== "paid" &&
      paymentAfter === "paid" &&
      updated.appliedCoupon &&
      updated.user
    ) {
      const coupon = await Coupon.findById(updated.appliedCoupon).session(
        session
      );
      if (coupon) {
        if (coupon.maxUsesTotal && coupon.usedCount >= coupon.maxUsesTotal) {
          await session.abortTransaction();
          session.endSession();
          return res
            .status(400)
            .json({ success: false, message: "Coupon usage limit reached" });
        }
        if (coupon.maxUsesPerUser && coupon.maxUsesPerUser > 0) {
          const alreadyPaidCount = await Order.countDocuments({
            user: updated.user,
            appliedCoupon: coupon._id,
            payment: { $in: ["paid", "partial"] },
            _id: { $ne: updated._id },
          }).session(session);
          if (alreadyPaidCount >= coupon.maxUsesPerUser) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              success: false,
              message: "Per-user usage limit reached",
            });
          }
        }
        await Coupon.updateOne(
          { _id: coupon._id },
          { $addToSet: { usedBy: updated.user }, $inc: { usedCount: 1 } },
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    // hydrate AFTER commit
    const hydratedForSheet = await Order.findById(updated._id)
      .populate("user", "firstName lastName email")
      .populate("appliedCoupon", "code type value")
      .populate("shippingAddress")
      .populate({
        path: "items",
        populate: { path: "products", model: "Product" },
      })
      .lean();

    // ⬇️ NEW: reflect status into Ongoing/History/Cancel
    try {
      await reflectOrderState(hydratedForSheet);
    } catch (err) {
      console.error("[Reflect:update] failed:", err?.message || err);
    }

    // make the Sheets write awaited so you always see logs/errors
    try {
      await pushOrderToSheet(hydratedForSheet);
      console.log("[Sheets:update] pushed for", hydratedForSheet.code);
    } catch (err) {
      console.error(
        "[Sheets:update] push failed:",
        err?.response?.data || err?.message || err
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order Updated Successfully",
      data: hydratedForSheet,
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {}
    session.endSession();
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id).lean();
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Optional: also clean up ongoing/cancel/history for this order
    try {
      await Promise.all([
        OngoingOrder.deleteOne({ order: id }),
        // Keep history/cancel if you want a permanent audit trail.
        // If you prefer cleanup, uncomment the next two lines:
        // OrderHistory.deleteMany({ order: id }),
        // OrderCancel.deleteMany({ order: id }),
      ]);
    } catch (err) {
      console.error("[Reflect:delete] cleanup failed:", err?.message || err);
    }

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const ids =
      Array.isArray(req.body?.ids) && req.body.ids.length
        ? req.body.ids
        : req.params?.ids
        ? String(req.params.ids).split(",")
        : [];

    if (!ids.length) {
      return res
        .status(400)
        .json({ success: false, message: "ids array is required" });
    }

    const result = await Order.deleteMany({ _id: { $in: ids } });

    // Optional: cleanup OngoingOrder for these ids
    try {
      await OngoingOrder.deleteMany({ order: { $in: ids } });
    } catch (err) {
      console.error("[Reflect:bulkDelete] ongoing cleanup failed:", err?.message || err);
    }

    return res.status(200).json({
      success: true,
      message: "Orders deleted successfully",
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
