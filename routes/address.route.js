const express = require("express");
const router = express.Router();

const {
    getAddresses,
    getAddress,
    createAddress,
    updateAddress,
    deleteAddress,
    bulkDelete,
} = require("../controllers/address.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getAddresses);
router.get("/lists/:id", getAddress);

/* -------------------------------- POST ----------------------------- */
router.post("/", createAddress);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateAddress);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteAddress);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
