const express = require("express");
const router = express.Router();

const {
  getPaymentMethod,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  bulkDelete,
} = require("../controllers/paymentMethod.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getPaymentMethod);
router.get("/lists/:id", getPaymentMethodById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createPaymentMethod);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updatePaymentMethod);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deletePaymentMethod);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
