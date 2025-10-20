const express = require("express");
const router = express.Router();

const {
    getCoupons,
    getCouponById,
    checkIfCouponExist,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    bulkDelete,
} = require("../controllers/coupon.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getCoupons);
router.get("/lists/:id", getCouponById);

/* -------------------------------- POST ----------------------------- */
router.post("/check", checkIfCouponExist);
router.post("/", createCoupon);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateCoupon);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteCoupon);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
