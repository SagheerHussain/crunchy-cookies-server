// controllers/coupon.controller.js
const Coupon = require("../models/Coupon.model");

/* -------------------------------- GET ----------------------------- */
const getCoupons = async (req, res) => {
  try {
    // Optionally support simple filters via query (isActive, code)
    const { isActive, code } = req.query;
    const filter = {};
    if (typeof isActive !== "undefined") filter.isActive = isActive === "true";
    if (code) filter.code = code.trim().toUpperCase();

    const coupons = await Coupon.find(filter).lean();
    // Return empty array as success; don't treat as an error
    return res.status(200).json({
      success: true,
      message: "Coupons fetched",
      data: coupons,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id).lean();
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Coupon fetched",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


/* -------------------------------- POST ----------------------------- */
const checkIfCouponExist = async (req, res) => {
  try {
    const { code } = req.body;

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      console.log("not found");
      return res.status(404).json({ message: "Coupon not found", success: false });
    }

    const now = new Date();

    // Check start & end date
    if (now < new Date(coupon.startAt) || now > new Date(coupon.endAt)) {
      console.log("expired by date");
      return res.status(200).json({ message: "Coupon expired", success: false });
    }

    // Check usage limit
    if (coupon.usedCount >= coupon.totalUsesLimit) {
      console.log("expired by usage");
      return res.status(200).json({ message: "Coupon usage limit reached", success: false });
    }

    console.log("found and valid");
    return res.status(200).json({
      message: "Coupon found successfully",
      success: true,
      coupon
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


const createCoupon = async (req, res) => {
  try {
    let {
      code,
      type, // 'percentage' | 'fixed'
      value, // number
      isActive = true,
      startsAt,
      endsAt,
      minOrderAmount = 0,
      maxDiscount = 0, // 0 = no cap
      maxUsesTotal = 0, // 0 = unlimited
      maxUsesPerUser = 0, // 0 = unlimited
    } = req.body;

    // Basic validation (let Mongoose handle the enum/required too)
    if (!code || !type || (value === undefined || value === null)) {
      return res.status(400).json({
        success: false,
        message: "code, type and value are required",
      });
    }

    // Normalize
    code = String(code).trim().toUpperCase();

    const payload = {
      code,
      type,
      value: Number(value),
      isActive: Boolean(isActive),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      maxUsesTotal: Number(maxUsesTotal) || 0,
      maxUsesPerUser: Number(maxUsesPerUser) || 0,
      usedCount: 0,
    };

    if (startsAt) payload.startsAt = new Date(startsAt);
    if (endsAt) payload.endsAt = new Date(endsAt);

    const coupon = await Coupon.create(payload);

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    // Handle duplicate code nicely
    if (error?.code === 11000 && error?.keyPattern?.code) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const allowed = [
      "code",
      "type",
      "value",
      "isActive",
      "startsAt",
      "endsAt",
      "minOrderAmount",
      "maxDiscount",
      "maxUsesTotal",
      "maxUsesPerUser",
      "usedCount", // allow manual admin adjustment if needed
    ];

    // pick only allowed fields
    const body = {};
    for (const k of allowed) {
      if (req.body.hasOwnProperty(k)) body[k] = req.body[k];
    }

    if (body.code) body.code = String(body.code).trim().toUpperCase();
    if (body.value != null) body.value = Number(body.value);
    if (body.minOrderAmount != null) body.minOrderAmount = Number(body.minOrderAmount);
    if (body.maxDiscount != null) body.maxDiscount = Number(body.maxDiscount);
    if (body.maxUsesTotal != null) body.maxUsesTotal = Number(body.maxUsesTotal);
    if (body.maxUsesPerUser != null) body.maxUsesPerUser = Number(body.maxUsesPerUser);
    if (body.usedCount != null) body.usedCount = Number(body.usedCount);
    if (body.startsAt) body.startsAt = new Date(body.startsAt);
    if (body.endsAt) body.endsAt = new Date(body.endsAt);

    const coupon = await Coupon.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
      context: "query",
    }).lean();

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.code) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id).lean();

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    // expect { ids: ["...", "..."] } in body
    const ids =
      Array.isArray(req.body?.ids) ? req.body.ids : (req.params?.ids ? String(req.params.ids).split(",") : []);

    if (!ids.length) {
      return res.status(400).json({ success: false, message: "ids array is required" });
    }

    const result = await Coupon.deleteMany({ _id: { $in: ids } });

    return res.status(200).json({
      success: true,
      message: "Coupons deleted successfully",
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCoupons,
  getCouponById,
  checkIfCouponExist,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  bulkDelete,
};
