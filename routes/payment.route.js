// routes/payment.route.js
const express = require("express");
const router = express.Router();

const {
  getPayment,
  getPaymentById,
  getPaymentByUserId,
  createPayment,
  updatePayment,
  deletePayment,
  bulkDelete,
} = require("../controllers/payment.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getPayment);
router.get("/lists/:id", getPaymentById);
router.get("/user/:userId", getPaymentByUserId);

/* -------------------------------- POST ----------------------------- */
router.post("/", createPayment);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updatePayment);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deletePayment);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
