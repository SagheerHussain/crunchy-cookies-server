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
const CategoryType = require("../models/CategoryType.model");

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
  const order = orderDocOrLean.toObject
    ? orderDocOrLean.toObject()
    : orderDocOrLean;

  const orderId = order._id;
  const status = String(order.status || "").toLowerCase();

  const isOngoing = ["pending", "confirmed", "shipped"].includes(status);
  const isHistory = ["delivered", "cancelled", "returned"].includes(status);
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
      .populate("recipients.address") // NEW
      .populate({
        path: "items",
        populate: { path: "product", model: "Product" },
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
      .populate("recipients.address") // NEW
      .populate({
        path: "items",
        populate: { path: "product", model: "Product" },
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
      .populate("recipients.address") // NEW
      .populate({
        path: "items",
        populate: { path: "product", model: "Product" },
      })
      .lean();

    return res
      .status(200)
      .json({ success: true, message: "Orders fetched", data: orders || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getCurrentLatestOrderByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
      
    return res
      .status(200)
      .json({
        success: true,
        message: "Orders fetched",
        data: orders[0] || [],
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    console.log(req.body);
    const {
      code,
      user,
      senderPhone,
      recipients: rawRecipients = [], // NEW
      items,
      shippingAddress, // keep for backward compat / single recipient
      deliveryInstructions,
      ar_deliveryInstructions,
      cardMessage,
      ar_cardMessage,
      cardImage,
      taxAmount,
      couponCode: _couponCode,
      appliedCoupon: _appliedCoupon,
    } = req.body;

    if (
      !code ||
      !user ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !senderPhone
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Please provide code, user, senderPhone, items",
      });
    }

    // Only one ongoing order per user
    const userOngoingOrder = await OngoingOrder.findOne({ user });
    if (userOngoingOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message:
          "Please place your order after your current order is delivered.",
      });
    }

    // ---------- Prices ----------
    const prices = await priceMapForProducts(
      items.map((i) => ({ product: i.product }))
    );
    if (prices.size === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Invalid products in items" });
    }

    let subtotal = 0;
    let totalQty = 0;

    // We'll build orderItemDocs later (after we know recipientIds)
    // For now just validate products & compute totals
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
      subtotal += unitPrice * qty;
      totalQty += qty;
    }

    subtotal = money(subtotal);

    // ---------- Coupon ----------
    let coupon = null;
    let discountAmount = 0;
    const incomingCoupon = (_couponCode || _appliedCoupon || "")
      .toString()
      .trim();

    if (incomingCoupon) {
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

    const tax = money(Number(taxAmount || 0));
    const total = money(subtotal - discountAmount + tax);

    // ---------- Recipients ----------
    // If frontend sends none, we fallback to single-recipient via shippingAddress.
    const preparedRecipients = [];

    if (Array.isArray(rawRecipients) && rawRecipients.length > 0) {
      for (let i = 0; i < rawRecipients.length; i++) {
        const r = rawRecipients[i] || {};
        if (!r.phone) {
          throw new Error(`Recipient ${i + 1}: phone is required`);
        }

        // Address: can be id or object
        let addressId = null;
        if (r.address) {
          if (typeof r.address === "string" && isValidObjectId(r.address)) {
            addressId = r.address;
          } else {
            const [addr] = await Address.create(
              [
                {
                  senderPhone: senderPhone,
                  receiverPhone: r.phone,
                  // add extra fields here if your Address schema extends later
                },
              ],
              { session }
            );
            addressId = addr._id;
          }
        }

        preparedRecipients.push({
          tempId: r.tempId || `r${i + 1}`,
          payload: {
            label: r.label || `Recipient ${i + 1}`,
            name: r.name || null,
            phone: r.phone,
            address: addressId,
            cardMessage: r.cardMessage || null,
            cardImage: r.cardImage || null,
            deliveryInstructions: r.deliveryInstructions || null,
          },
        });
      }
    } else if (shippingAddress) {
      // backward compatible single recipient
      let addressId = null;
      if (isValidObjectId(shippingAddress)) {
        addressId = shippingAddress;
      } else {
        const [addr] = await Address.create([shippingAddress], {
          session,
        });
        addressId = addr._id;
      }

      preparedRecipients.push({
        tempId: "r1",
        payload: {
          label: "Recipient 1",
          phone: senderPhone, // or shippingAddress.receiverPhone
          address: addressId,
          cardMessage: cardMessage || null,
          cardImage: cardImage || "https://res.cloudinary.com/dso2jjdcz/image/upload/v1762843729/Gemini_Generated_Image_sy9p07sy9p07sy9p_a6gikd.png",
          deliveryInstructions: deliveryInstructions || null,
        },
      });
    } else {
      throw new Error("At least one recipient or shippingAddress is required");
    }

    // ---------- Create Order (without items yet) ----------
    const [orderDoc] = await Order.create(
      [
        {
          code,
          user,
          senderPhone,
          recipients: preparedRecipients.map((r) => r.payload),
          items: [],
          totalItems: items?.length,
          subtotalAmount: subtotal,
          discountAmount,
          taxAmount: tax,
          grandTotal: total,
          appliedCoupon: coupon ? coupon._id : undefined,
          // keep legacy fields for compatibility
          shippingAddress: isValidObjectId(shippingAddress)
            ? shippingAddress
            : undefined,
          deliveryInstructions,
          ar_deliveryInstructions,
          cardMessage,
          ar_cardMessage,
          cardImage,
          placedAt: new Date(),
          status: "pending",
          payment: "paid",
        },
      ],
      { session }
    );

    // Map tempId -> real recipientId
    const recipientIdByTemp = {};
    orderDoc.recipients.forEach((rec, idx) => {
      const tempId = preparedRecipients[idx].tempId;
      recipientIdByTemp[tempId] = rec._id;
    });

    // ---------- Build OrderItems with allocations ----------
    const orderItemDocs = [];

    for (const it of items) {
      const pid = String(it.product);
      const qty = Math.max(1, Number(it.quantity || 1));
      const unitPrice = Number(prices.get(pid) || 0);
      const lineSubtotal = unitPrice * qty;

      if (!unitPrice) {
        throw new Error("Invalid product in items");
      }

      // allocations from frontend
      let allocations = [];

      if (Array.isArray(it.allocations) && it.allocations.length > 0) {
        let sum = 0;
        allocations = it.allocations.map((a) => {
          const recId =
            recipientIdByTemp[a.recipientTempId || a.recipientTempId];
          if (!recId) {
            throw new Error("Invalid recipientTempId in allocations");
          }
          const q = Number(a.quantity || 0);
          if (q <= 0) {
            throw new Error("Allocation quantity must be > 0");
          }
          sum += q;
          return { recipientId: recId, quantity: q };
        });
        if (sum !== qty) {
          throw new Error(
            `Allocated quantity (${sum}) must equal item quantity (${qty})`
          );
        }
      } else {
        // default: all quantity to first recipient
        const firstTempId = preparedRecipients[0].tempId;
        allocations = [
          {
            recipientId: recipientIdByTemp[firstTempId],
            quantity: qty,
          },
        ];
      }

      orderItemDocs.push({
        order: orderDoc._id,
        product: it.product,
        quantity: qty,
        allocations,
        discountForProducts: 0,
        totalAmount: money(lineSubtotal),
      });
    }

    const createdItems = await OrderItem.insertMany(orderItemDocs, {
      session,
    });

    // Attach items to order
    orderDoc.items = createdItems.map((d) => d._id);
    await orderDoc.save({ session });

    // ---------- STOCK CHECKS (unchanged logic, just use createdItems) ----------
    for (const item of createdItems) {
      const orderItem = await OrderItem.findById(item._id)
        .populate(
          "product",
          "_id remainingStocks totalStocks totalPieceSold totalPieceCarry type"
        )
        .session(session);

      if (!orderItem || !orderItem.product) {
        throw new Error("Order item has no products");
      }

      const qty = Number(orderItem.quantity || 1);
      const product = orderItem.product;

      if ((product.remainingStocks || 0) < qty) {
        throw new Error(`Insufficient stock for product ${product._id}`);
      }

      // CategoryType stock validation (same as your existing)
      if (Array.isArray(product.type) && product.type.length > 0) {
        const pieceCarry = Number(product.totalPieceCarry || 0);
        const totalDeduct = qty * pieceCarry;

        if (totalDeduct > 0) {
          const types = await CategoryType.find({
            _id: { $in: product.type },
          })
            .select("_id remainingStock")
            .session(session);

          for (const t of types) {
            if ((t.remainingStock || 0) < totalDeduct) {
              throw new Error(
                `Insufficient category type stock for type ${t._id}`
              );
            }
          }
        }
      }
    }

    // ---------- STOCK DEDUCTION ----------
    for (const item of createdItems) {
      const orderItem = await OrderItem.findById(item._id)
        .populate(
          "product",
          "_id remainingStocks totalStocks totalPieceSold totalPieceCarry type"
        )
        .session(session);

      const qty = Number(orderItem.quantity || 1);
      const product = orderItem.product;

      const newRemaining = Math.max(0, (product.remainingStocks || 0) - qty);

      let stockStatus = "in_stock";
      if (newRemaining <= 0) stockStatus = "out_of_stock";
      else if (
        product.totalStocks &&
        newRemaining < product.totalStocks * 0.2
      ) {
        stockStatus = "low_stock";
      }

      await Product.findByIdAndUpdate(
        product._id,
        {
          $set: { remainingStocks: newRemaining, stockStatus },
          $inc: { totalPieceSold: qty },
        },
        { session }
      );

      // CategoryType deduction (unchanged)
      if (Array.isArray(product.type) && product.type.length > 0) {
        const pieceCarry = Number(product.totalPieceCarry || 0);
        const totalDeduct = qty * pieceCarry;

        if (totalDeduct > 0) {
          const types = await CategoryType.find({
            _id: { $in: product.type },
          }).session(session);

          for (const ct of types) {
            const nextRemaining = Math.max(
              0,
              (ct.remainingStock || 0) - totalDeduct
            );

            let typeStatus = "in_stock";
            if (nextRemaining <= 0) typeStatus = "out_of_stock";
            else if (ct.totalStock && nextRemaining < ct.totalStock * 0.2) {
              typeStatus = "low_stock";
            }

            await CategoryType.findByIdAndUpdate(
              ct._id,
              {
                $set: {
                  remainingStock: nextRemaining,
                  stockStatus: typeStatus,
                },
                $inc: { totalPieceUsed: totalDeduct },
              },
              { session }
            );
          }
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    // hydrate for sheet + reflect
    const hydratedForSheet = await Order.findById(orderDoc._id)
      .populate("user", "firstName lastName email")
      .populate("appliedCoupon", "code type value")
      .populate("shippingAddress")
      .populate("recipients.address")
      .populate({
        path: "items",
        populate: { path: "product", model: "Product" },
      })
      .lean();

    try {
      await reflectOrderState(hydratedForSheet);
    } catch (err) {
      console.error("[Reflect:create] failed:", err?.message || err);
    }

    pushOrderToSheet(hydratedForSheet).catch((err) => {
      console.error(
        "[Sheets:create]",
        err?.response?.data || err?.errors || err?.message || err
      );
    });

    return res.status(200).json({
      success: true,
      message: "Order Placed Successfully",
      data: hydratedForSheet,
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {}
    console.log(error);
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

    if (patch.status === "cancelled") {
      patch.payment = "failed";
    } else if (patch.status === "returned") {
      patch.payment = "refunded";
    }

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
      .populate("recipients.address")
      .populate({
        path: "items",
        populate: { path: "product", model: "Product" },
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
    const result = await Order.deleteMany({});

    // Optional: cleanup OngoingOrder for these ids
    try {
      await OngoingOrder.deleteMany({});
    } catch (err) {
      console.error(
        "[Reflect:bulkDelete] ongoing cleanup failed:",
        err?.message || err
      );
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
  getCurrentLatestOrderByUser,
  createOrder,
  updateOrder,
  deleteOrder,
  bulkDelete,
};
