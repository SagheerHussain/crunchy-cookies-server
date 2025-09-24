const express = require("express");
const router = express.Router();

const upload = require("../upload");

const {
  getRecipients,
  getRecipientById,
  createRecipient,
  updateRecipient,
  deleteRecipient,
  bulkDelete,
} = require("../controllers/recipeint.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getRecipients);
router.get("/lists/:id", getRecipientById);

/* -------------------------------- POST ----------------------------- */
router.post("/", upload.single("image"), createRecipient);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", upload.single("image"), updateRecipient);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteRecipient);
router.delete("/delete/bulk/:ids", bulkDelete);

module.exports = router;
