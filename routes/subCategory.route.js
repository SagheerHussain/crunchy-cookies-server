const express = require("express");
const router = express.Router();

const upload = require("../upload");

const {
    getSubCategories,
    getSubCategoryById,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    bulkDelete,
} = require("../controllers/subCategory.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getSubCategories);
router.get("/lists/:id", getSubCategoryById);

/* -------------------------------- POST ----------------------------- */
router.post("/", upload.single("image"), createSubCategory);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", upload.single("image"), updateSubCategory);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteSubCategory);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
