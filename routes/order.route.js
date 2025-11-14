const express = require("express");
const router = express.Router();

const {
    getOrders,
    getOrderById,
    getOrdersByUser,
    getCurrentLatestOrderByUser,
    createOrder,
    updateOrder,
    deleteOrder,
    bulkDelete,
} = require("../controllers/order.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getOrders);
router.get("/lists/:id", getOrderById);
router.get("/lists/current-latest-order/:userId", getCurrentLatestOrderByUser);
router.get("/lists/user/:userId", getOrdersByUser);

/* -------------------------------- POST ----------------------------- */
router.post("/", createOrder);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateOrder);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteOrder);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
