const express = require("express");
const router = express.Router();

const {
    getInvoices,
    getInvoiceById,
    getInvoiceByUser,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    bulkDelete,
} = require("../controllers/invoice.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getInvoices);
router.get("/lists/:id", getInvoiceById);
router.get("/lists/user/:userId", getInvoiceByUser);

/* -------------------------------- POST ----------------------------- */
router.post("/", createInvoice);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateInvoice);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteInvoice);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
