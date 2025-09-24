const express = require("express");
const router = express.Router();

const upload = require("../upload");

const {
    getOccasions,
    getOccasionById,
    createOccasion,
    updateOccasion,
    deleteOccasion,
    bulkDelete,
} = require("../controllers/occasion.controller");
 
/* -------------------------------- GET ----------------------------- */
router.get("/lists", getOccasions);
router.get("/lists/:id", getOccasionById);

/* -------------------------------- POST ----------------------------- */
router.post("/", upload.single("image"), createOccasion);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", upload.single("image"), updateOccasion);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteOccasion);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
