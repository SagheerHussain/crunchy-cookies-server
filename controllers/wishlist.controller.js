const Wishlist = require("../models/Wishlist.model");

/* ------------------------------ GET ------------------------------ */
const getWishlists = async (_req, res) => {
  try {
    const wishlists = await Wishlist.find()
      .populate("user")
      .populate("product")
      .lean();

    return res.status(200).json({
      success: true,
      message: "All wishlists",
      data: wishlists || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getWishlistById = async (req, res) => {
  try {
    const { id } = req.params;
    const wishlist = await Wishlist.findById(id)
      .populate("user")
      .populate("product")
      .lean();

    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Wishlist found",
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getWishlistByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const list = await Wishlist.find({ user: userId })
      .populate("user")
      .populate("product")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Wishlist by user",
      data: list || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ------------------------------ POST ----------------------------- */
// Idempotent create (no duplicates)
const createWishlist = async (req, res) => {
  try {
    const { user, product } = req.body;
    if (!user || !product) {
      return res.status(400).json({ success: false, message: "user and product are required" });
    }

    // Upsert to avoid duplicates
    const doc = await Wishlist.findOneAndUpdate(
      { user, product },
      { $setOnInsert: { user, product } },
      { new: true, upsert: true }
    );

    const isNew = doc.createdAt && Math.abs(Date.now() - new Date(doc.createdAt).getTime()) < 3000;

    return res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? "Wishlist created" : "Already in wishlist",
      data: doc,
    });
  } catch (error) {
    if (error?.code === 11000) {
      // unique index conflict → already exists
      return res.status(200).json({ success: true, message: "Already in wishlist" });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ----------------------------- DELETE ---------------------------- */
// Delete exactly one entry for specific user+product
const deleteWishlistByUserProduct = async (req, res) => {
  try {
    // accept both body OR query (to support both call styles)
    const user = req.body?.user || req.query?.user;
    const product = req.body?.product || req.query?.product;

    if (!user || !product) {
      return res.status(400).json({ success: false, message: "user and product are required" });
    }

    const deleted = await Wishlist.findOneAndDelete({ user, product });

    return res.status(200).json({
      success: true,
      message: deleted ? "Wishlist item removed" : "Nothing to delete",
      data: deleted,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// (Optional) delete by id — keep for admin/tools if you want
const deleteWishlistById = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Wishlist.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: deleted ? "Wishlist deleted" : "Not found",
      data: deleted,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const updateWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, product } = req.body;
    const updated = await Wishlist.findByIdAndUpdate(id, { user, product }, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Wishlist updated",
      data: updated,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: "Duplicate user+product" });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params; // comma-separated ids
    const arr = (ids || "").split(",").filter(Boolean);
    const result = await Wishlist.deleteMany({ _id: { $in: arr } });

    return res.status(200).json({
      success: true,
      message: "Wishlist deleted",
      data: result,
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
  deleteWishlistByUserProduct,
  deleteWishlistById,
  updateWishlist,
  bulkDelete,
};
