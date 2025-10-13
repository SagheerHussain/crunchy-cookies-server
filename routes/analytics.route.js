const express = require("express");
const router = express.Router();

const {
    getOverview
} = require("../controllers/analytics.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/overview", getOverview);

module.exports = router;
