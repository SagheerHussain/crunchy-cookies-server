const express = require("express");
const router = express.Router();

const {
    getOrdersCancel,
    getOrderCancelById,
    getOrdersCancelByUser,
    createOrderCancel,
    updateOrderCancel,
    deleteOrderCancel,
    bulkDelete,
} = require("../controllers/orderCancel.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getOrdersCancel);
router.get("/lists/:id", getOrderCancelById);
router.get("/lists/user/:userId", getOrdersCancelByUser);

/* -------------------------------- POST ----------------------------- */
router.post("/", createOrderCancel);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateOrderCancel);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteOrderCancel);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
