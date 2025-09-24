const Cart = require("../models/Cart.model");

/* -------------------------------- GET ----------------------------- */
const getCarts = async (req, res) => {
  try {
    const cart = await Cart.find().populate("items").populate("user").lean();
    if (cart.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Carts not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Carts found successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getCartById = async (req, res) => {
  try {
    const { id } = req.params;
    const cart = await Cart.findById({ _id: id }).populate("items").populate("user").lean();
    if (!cart) {
      return res
        .status(200)
        .json({ success: false, message: "Cart not found" });
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
      const cart = await Cart.findOne({ user: userId }).populate("items").populate("user").lean();
      if (!cart) {
        return res
          .status(200)
          .json({ success: false, message: "Cart not found" });
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

/* -------------------------------- POST ----------------------------- */
const createCart = async (req, res) => {
  try {
    const { user, total_items, items, deliveryCharges } = req.body;

    if (!user || !total_items || !items || !deliveryCharges) {
      return res
        .status(200)
        .json({ success: false, message: "Cart not found" });
    }

    const cart = await Cart.create({ user, total_items, items, deliveryCharges });

    return res.status(201).json({
      success: true,
      message: "Cart created successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateCart = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, total_items, items, deliveryCharges } = req.body;
    const cart = await Cart.findByIdAndUpdate(
      { _id: id },
      { user, total_items, items, deliveryCharges }
    );

    return res.status(201).json({
      success: true,
      message: "Cart updated successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteCart = async (req, res) => {
  try {
    const { id } = req.params;
    const cart = await Cart.findOneAndDelete({ _id: id });

    return res.status(201).json({
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
    const { ids } = req.params;
    const cart = await Cart.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Carts deleted successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCarts,
  getCartById,
  getCartByUser,
  createCart,
  updateCart,
  deleteCart,
  bulkDelete,
};