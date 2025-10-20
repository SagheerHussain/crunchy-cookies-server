// routes/cart.route.js
const router = require("express").Router();
const {// list/detail
  getCarts,
  getCartById,
  getCartByUser,
  getCartLength,

  // cart document ops
  createCart,
  updateCart,
  deleteCart,
  bulkDelete,

  // item-level ops
  addItem,
  addBundle,
  setItemQty,
  removeItem, } = require("../controllers/cart.controller");

router.get("/lists", getCarts);
router.get("/lists/:id", getCartById);
router.get("/lists/user/:userId", getCartByUser);
router.get("/length/:userId", getCartLength);

router.post("/", createCart);
router.put("/update:id", updateCart);
router.delete("/delete/:id", deleteCart);
router.delete("/bulk", bulkDelete);

// item-level
router.post("/items", addItem);            // { user, product, qty }
router.post("/bundle", addBundle);         // { user, items: [{product, qty}, ...] }
router.patch("/items/update/:productId", setItemQty); // { user, qty }
router.delete("/items/delete", removeItem); // { user }

module.exports = router;
