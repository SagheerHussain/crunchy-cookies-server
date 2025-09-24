const express = require("express");
const router = express.Router();

const {
    getOngoingOrders,
    getOngoingOrderById,
    getOngoingOrderByUser,
    createOngoingOrder,
    updateOngoingOrder,
    deleteOngoingOrder,
    bulkDelete,
} = require("../controllers/ongoingOrder.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getOngoingOrders);
router.get("/lists/:id", getOngoingOrderById);
router.get("/lists/user/:userId", getOngoingOrderByUser);

/* -------------------------------- POST ----------------------------- */
router.post("/", createOngoingOrder);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateOngoingOrder);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteOngoingOrder);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
