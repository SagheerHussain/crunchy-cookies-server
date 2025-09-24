const Wishlist = require("../models/Wishlist.model");

/* -------------------------------- GET ----------------------------- */
const getWishlists = async (req, res) => {
  try {
    const wishlists = await Wishlist.find().populate("roles").lean();
    if (wishlists.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Wishlists not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Wishlists found successfully",
      data: wishlists,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getWishlistById = async (req, res) => {
  try {
    const { id } = req.params;
    const wishlist = await Wishlist.findById({ _id: id }).lean();
    if (!wishlist) {
      return res
        .status(200)
        .json({ success: false, message: "Wishlist not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Wishlist found successfully",
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getWishlistByUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const wishlist = await Wishlist.findById({ user: userId }).lean();
      if (!wishlist) {
        return res
          .status(200)
          .json({ success: false, message: "Wishlist not found" });
      }
      return res.status(200).json({
        success: true,
        message: "Wishlist found successfully",
        data: wishlist,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  };

/* -------------------------------- POST ----------------------------- */
const createWishlist = async (req, res) => {
  try {
    const { user, products } = req.body;

    if (!user || !products) {
      return res
        .status(200)
        .json({ success: false, message: "All fields are required" });
    }

    const createWishlist = await Wishlist.create({
      user,
      products,
    });

    return res.status(201).json({
      success: true,
      message: "Wishlist created successfully",
      data: createWishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, products } = req.body;

    const updateWishlist = await Wishlist.findByIdAndUpdate(
      { _id: id },
      {
        user,
        products,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Wishlist updated successfully",
      data: updateWishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteWishlist = await Wishlist.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Wishlist deleted successfully",
      data: deleteWishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const deleteWishlist = await Wishlist.deleteMany({
      _id: { $in: ids },
    });

    return res.status(201).json({
      success: true,
      message: "Wishlist deleted successfully",
      data: deleteWishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getWishlists,
  getWishlistById,
  getWishlistByUser,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  bulkDelete,
};
