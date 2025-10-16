// controllers/cart.controller.js
const mongoose = require("mongoose");
const Cart = require("../models/Cart.model");

/* ------------------------------- helpers ------------------------------- */
function normalizeItems(items = []) {
  // Input: [{ product, qty }, ...]
  // Output: merged by product, qty >= 1
  const m = new Map();
  for (const it of items) {
    if (!it || !it.product) continue;
    const id = String(it.product);
    const q = Number(it.qty) || 0;
    if (q < 1) continue;
    m.set(id, (m.get(id) || 0) + q);
  }
  return Array.from(m.entries()).map(([product, qty]) => ({ product, qty }));
}

const basePopulate = [
  { path: "user", select: "_id name email" },
  { path: "items.product", select: "_id title ar_title description ar_description price images slug sku" },
];

/* -------------------------------- GET ---------------------------------- */
const getCarts = async (_req, res) => {
  try {
    const carts = await Cart.find().populate(basePopulate).lean();
    if (!carts.length) {
      return res.status(404).json({ success: false, message: "No carts found" });
    }
    return res.status(200).json({
      success: true,
      message: "Carts found successfully",
      data: carts,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getCartById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid cart id" });
    }
    const cart = await Cart.findById(id).populate(basePopulate).lean();
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Cart found successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getCartByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    const cart = await Cart.findOne({ user: userId }).populate(basePopulate).lean();
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Cart found successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST --------------------------------- */
// Create a cart (one-per-user assumed). If exists, return 409.
const createCart = async (req, res) => {
  try {
    const { user, items = [], deliveryCharges = 0 } = req.body;

    if (!user) {
      return res.status(400).json({ success: false, message: "user is required" });
    }
    if (!mongoose.isValidObjectId(user)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const exists = await Cart.findOne({ user }).lean();
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Cart already exists for this user. Use update or item endpoints.",
      });
    }

    const cart = await Cart.create({
      user,
      items: normalizeItems(items),
      deliveryCharges: Number(deliveryCharges) || 0,
    });

    const populated = await cart.populate(basePopulate);
    return res.status(201).json({
      success: true,
      message: "Cart created successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ---------------------------------- */
// Full document update (does NOT accept total_items; treat that as virtual)
const updateCart = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, items, deliveryCharges } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid cart id" });
    }
    if (user && !mongoose.isValidObjectId(user)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const update = {};
    if (typeof user !== "undefined") update.user = user;
    if (typeof items !== "undefined") update.items = normalizeItems(items);
    if (typeof deliveryCharges !== "undefined") update.deliveryCharges = Number(deliveryCharges) || 0;

    const cart = await Cart.findByIdAndUpdate(id, update, { new: true });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const populated = await cart.populate(basePopulate);
    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ------------------------------- DELETE -------------------------------- */
const deleteCart = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid cart id" });
    }
    const cart = await Cart.findByIdAndDelete(id);
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Cart deleted successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    // Expect: { ids: ["...", "..."] } in BODY
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: "ids (array) is required in body" });
    }
    const validIds = ids.filter(mongoose.isValidObjectId);
    if (!validIds.length) {
      return res.status(400).json({ success: false, message: "No valid ids provided" });
    }
    const result = await Cart.deleteMany({ _id: { $in: validIds } });
    return res.status(200).json({
      success: true,
      message: "Carts deleted successfully",
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ------------------------ Item-level operations ------------------------ */
// Add/Increment a single item (your “Add to Cart” button)
// POST /cart/items  body: { user, product, qty = 1 }
const addItem = async (req, res) => {
  try {
    const { user, product, qty = 1 } = req.body;
    if (!mongoose.isValidObjectId(user) || !mongoose.isValidObjectId(product)) {
      return res.status(400).json({ success: false, message: "Invalid ids" });
    }

    let cart = await Cart.findOne({ user });
    if (!cart) cart = await Cart.create({ user, items: [] });

    const incoming = normalizeItems([{ product, qty }]);
    const map = new Map(cart.items.map(i => [String(i.product), i.qty]));
    for (const it of incoming) {
      const key = String(it.product);
      map.set(key, (map.get(key) || 0) + it.qty);
    }

    cart.items = Array.from(map.entries()).map(([p, q]) => ({ product: p, qty: q }));
    await cart.save();

    const populated = await cart.populate(basePopulate);
    return res.status(200).json({ success: true, message: "Item added", data: populated });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

// Add bundle / Frequently Bought Together
// POST /cart/bundle  body: { user, items: [{product, qty}, ...] }
const addBundle = async (req, res) => {
  try {
    const { user, items = [] } = req.body;
    if (!mongoose.isValidObjectId(user)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const incoming = normalizeItems(items);
    if (!incoming.length) {
      return res.status(400).json({ success: false, message: "No valid items" });
    }

    let cart = await Cart.findOne({ user });
    if (!cart) cart = await Cart.create({ user, items: [] });

    const map = new Map(cart.items.map(i => [String(i.product), i.qty]));
    for (const it of incoming) {
      const key = String(it.product);
      map.set(key, (map.get(key) || 0) + it.qty);
    }

    cart.items = Array.from(map.entries()).map(([p, q]) => ({ product: p, qty: q }));
    await cart.save();

    const populated = await cart.populate(basePopulate);
    return res.status(200).json({ success: true, message: "Bundle added", data: populated });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

// Set quantity for a specific product (qty<=0 removes it)
// PATCH /cart/items/:productId  body: { user, qty }
const setItemQty = async (req, res) => {
  try {
    const { user, qty } = req.body;
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(user) || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid ids" });
    }

    const cart = await Cart.findOne({ user });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const idx = cart.items.findIndex(i => String(i.product) === String(productId));
    if (idx === -1) return res.status(404).json({ success: false, message: "Item not found in cart" });

    const n = Number(qty) || 0;
    if (n <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].qty = n;
    }

    await cart.save();
    const populated = await cart.populate(basePopulate);
    return res.status(200).json({ success: true, message: "Cart updated", data: populated });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

// Remove a product from cart
const removeItem = async (req, res) => {
  try {
    const { user, productIds } = req.body;
    console.log("BODY:", user, productIds);

    // validate user id
    if (!mongoose.isValidObjectId(user)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    // validate productIds
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "productIds must be a non-empty array" });
    }

    const validIds = productIds.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: "No valid product ids" });
    }

    const cart = await Cart.findOneAndUpdate(
      { user },
      { $pull: { items: { product: { $in: validIds } } } },
      { new: true }
    ).populate(basePopulate);

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    return res.status(200).json({ success: true, message: "Items removed", data: cart });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

const getCartLength = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const cart = await Cart.findOne({ user: userId }).select("items");

    const distinct = cart?.items?.length || 0; // number of different products
    const totalQty =
      cart?.items?.reduce((sum, it) => sum + Number(it?.qty || 0), 0) || 0; // sum of quantities

    return res.status(200).json({
      success: true,
      message: "Cart length fetched",
      data: { distinct, totalQty },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
/* -------------------------------- export ------------------------------- */
module.exports = {
  // list/detail
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
  removeItem,
};
