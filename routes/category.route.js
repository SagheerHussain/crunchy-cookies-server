const express = require("express");
const router = express.Router();
const upload = require("../upload");

const {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    bulkDelete,
} = require("../controllers/category.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getCategories);
router.get("/lists/:id", getCategoryById);

/* -------------------------------- POST ----------------------------- */
router.post("/", upload.single("image"), createCategory);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", upload.single("image"), updateCategory);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteCategory);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
