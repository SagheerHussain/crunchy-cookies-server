const CartItem = require("../models/CartItems.model");

/* -------------------------------- GET ----------------------------- */
const getCartItems = async (req, res) => {
  try {
    const cartItems = await CartItem.find().populate("productItem").lean();
    if (cartItems.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Cart Items not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Cart Items found successfully",
      data: cartItems,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getCartItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const cartItem = await CartItem.findById({ _id: id }).populate("productItem").lean();
    if (!cartItem) {
      return res
        .status(200)
        .json({ success: false, message: "Cart Item not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Cart Item found successfully",
      data: cartItem,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createCartItem = async (req, res) => {
  try {
    const { productItem, qty } = req.body;

    if (!productItem || !qty) {
      return res
        .status(200)
        .json({ success: false, message: "Cart Item not found" });
    }

    const cartItem = await CartItem.create({ productItem, qty });

    return res.status(201).json({
      success: true,
      message: "Cart Item created successfully",
      data: cartItem,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { productItem, qty } = req.body;
    const cartItem = await CartItem.findByIdAndUpdate(
      { _id: id },
      { productItem, qty }
    );

    return res.status(201).json({
      success: true,
      message: "Cart Item updated successfully",
      data: cartItem,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const cartItem = await CartItem.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Cart Item deleted successfully",
      data: cartItem,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const cartItem = await CartItem.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Cart Items deleted successfully",
      data: cartItem,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCartItems,
  getCartItemById,
  createCartItem,
  updateCartItem,
  deleteCartItem,
  bulkDelete,
};