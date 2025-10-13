const express = require("express");
const router = express.Router();

const {
    getCategoryTypes,
    getCategoryTypeById,
    createCategoryType,
    updateCategoryType,
    deleteCategoryType,
    bulkDelete,
} = require("../controllers/categoryType.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getCategoryTypes);
router.get("/lists/:id", getCategoryTypeById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createCategoryType);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateCategoryType);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteCategoryType);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
