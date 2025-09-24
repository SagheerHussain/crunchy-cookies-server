const Coupon = require("../models/Coupon.model");

/* -------------------------------- GET ----------------------------- */
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().populate("users").lean();
    if (coupons.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Coupons not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Coupons found successfully",
      data: coupons,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById({ _id: id }).populate("users").lean();
    if (!coupon) {
      return res
        .status(200)
        .json({ success: false, message: "Coupon not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Coupon found successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createCoupon = async (req, res) => {
  try {
    const { code, type, value, totalUsesLimit, users, startAt, endAt } = req.body;

    if (!code || !type || !value || !totalUsesLimit || !users || !startAt || !endAt) {
      return res
        .status(200)
        .json({ success: false, message: "Coupon not found" });
    }

    const coupon = await Coupon.create({ code, type, value, totalUsesLimit, users, startAt, endAt, isActive: true, usedCount: 0 });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, type, value, totalUsesLimit, usedCount, users, startAt, endAt, isActive } = req.body;
    const coupon = await Coupon.findByIdAndUpdate(
      { _id: id },
      { code, type, value, totalUsesLimit, usedCount, users, startAt, endAt, isActive }
    );

    return res.status(201).json({
      success: true,
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Coupon deleted successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const coupon = await Coupon.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Coupon deleted successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  bulkDelete,
};