const express = require("express");
const router = express.Router();

const {
    getOverview,
    getCurrentYearOrders,
    getCustomersReviews,
    getSalesBreakdown,
    getCountsOrdersAndSales
} = require("../controllers/analytics.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/overview", getOverview);
router.get("/current-year-order", getCurrentYearOrders);
router.get("/customer-reviews", getCustomersReviews);
router.get("/sales", getSalesBreakdown);
router.get("/counts", getCountsOrdersAndSales);

module.exports = router;
