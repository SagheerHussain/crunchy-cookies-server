// controllers/product.controller.js
const Product = require("../models/Product.model");
const cloudinary = require("../config/cloudinary");
const mongoose = require("mongoose");

// ⬇️ add these two lines (assuming file names match your models)
const SubCategory = require("../models/SubCategory.model");
const Occasion = require("../models/Occasion.model");
const Recipient = require("../models/Recipient.model");
const Brand = require("../models/Brand.model");

const AVAILABILITY = ["in_stock", "low_stock", "out_of_stock"];

/* ------------------------- helpers ------------------------- */
const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

const toNum = (v, fallback = undefined) => {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toBool = (v, fallback = false) => {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (["true", "1", "yes", "on"].includes(s)) return true;
  if (["false", "0", "no", "off"].includes(s)) return false;
  return fallback;
};

function maybeJSON(v) {
  if (v == null || v === "") return undefined;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}

const normalizeId = (v) => {
  if (v === undefined || v === null) return undefined;
  const s = typeof v === "string" ? v.trim() : v;
  if (s === "" || s === "null" || s === "undefined") return undefined;
  return isValidObjectId(s) ? s : undefined;
};

const normalizeIdArray = (arr) => {
  if (!arr) return undefined;
  const xs = Array.isArray(arr) ? arr : [arr];
  return xs
    .map((v) => (typeof v === "string" ? v.trim() : v))
    .filter(
      (v) => v && v !== "null" && v !== "undefined" && isValidObjectId(v)
    );
};

const nameOrTitleFilter = (names = []) => ({
  $or: names.map((n) => ({
    $or: [
      { name: { $regex: `^${String(n).trim()}$`, $options: "i" } },
      { title: { $regex: `^${String(n).trim()}$`, $options: "i" } },
    ],
  })),
});

// fetch SubCategory ids by names
async function subCategoryIdsByNames(names = []) {
  const docs = await SubCategory.find(nameOrTitleFilter(names))
    .select("_id")
    .lean();
  return docs.map((d) => d._id);
}

// fetch Occasion id(s) by a single name (or array)
async function occasionIdsByNames(names = []) {
  const docs = await Occasion.find(nameOrTitleFilter(names))
    .select("_id")
    .lean();
  return docs.map((d) => d._id);
}

async function recipientIdsByNames(names = []) {
  const docs = await Recipient.find(nameOrTitleFilter(names))
    .select("_id")
    .lean();
  return docs.map((d) => d._id);
}

// Accept: key, key[], key[0] styles or JSON string
const pickArray = (body, key) => {
  const direct = body[key];
  if (Array.isArray(direct)) return direct;

  if (typeof direct === "string") {
    // if it's JSON, parse; else treat single value
    try {
      const parsed = JSON.parse(direct);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return direct ? [direct] : [];
  }

  // Collect k[] and k[i] variants
  const out = [];
  Object.keys(body).forEach((k) => {
    if (k === `${key}[]`) {
      const v = body[k];
      if (Array.isArray(v)) out.push(...v);
      else if (typeof v === "string" && v.length) out.push(v);
    } else if (k.startsWith(`${key}[`)) {
      out.push(body[k]);
    }
  });
  return out.filter((x) => x !== undefined && x !== null && x !== "");
};

// dimensions from multipart (update) — returns numbers (or undefined) separately
const pickDimensionsUpdate = (body) => {
  let width, height;

  if (body.dimensions) {
    try {
      const d =
        typeof body.dimensions === "string"
          ? JSON.parse(body.dimensions)
          : body.dimensions;
      if (d && typeof d === "object") {
        if (d.width !== undefined && d.width !== "") width = toNum(d.width);
        if (d.height !== undefined && d.height !== "") height = toNum(d.height);
      }
    } catch (_) {}
  }

  if (
    body["dimensions.width"] !== undefined &&
    body["dimensions.width"] !== ""
  ) {
    width = toNum(body["dimensions.width"]);
  }
  if (
    body["dimensions.height"] !== undefined &&
    body["dimensions.height"] !== ""
  ) {
    height = toNum(body["dimensions.height"]);
  }

  return { width, height };
};

const deriveStock = (total, remain) => {
  const t = Number(total || 0);
  const r = Number(remain || 0);
  const sold = Math.max(0, t - r);

  let stockStatus = "in_stock";
  if (t <= 0 || r <= 0) stockStatus = "out_of_stock";
  else if (r / t <= 0.15) stockStatus = "low_stock";

  return { totalPieceSold: sold, stockStatus };
};

const toList = (v) =>
  Array.from(
    new Set(
      (Array.isArray(v) ? v : `${v || ""}`.split(","))
        .map((x) => `${x}`.trim())
        .filter(Boolean)
    )
  );

// Given a list of IDs/slugs, return the matching _ids for a model (by slug or _id)
async function resolveIds(Model, values) {
  if (!values?.length) return [];

  const byId = values.filter(isValidObjectId);
  const bySlug = values.filter((x) => !isValidObjectId(x));

  const found = [];

  if (byId.length) {
    // Only take valid ObjectIds—assume they exist
    found.push(...byId.map((id) => new mongoose.Types.ObjectId(id)));
  }

  if (bySlug.length && Model) {
    const docs = await Model.find({ slug: { $in: bySlug } }, { _id: 1 }).lean();
    found.push(...docs.map((d) => d._id));
  }

  return Array.from(new Set(found.map(String))).map(
    (id) => new mongoose.Types.ObjectId(id)
  );
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Optional sort mapping
function buildSort(sortKey) {
  switch (sortKey) {
    case "price-asc":
      return { price: 1 };
    case "price-desc":
      return { price: -1 };
    case "new-desc":
      return { createdAt: -1 };
    case "rating-desc":
      // If you later add a rating field, change this
      return { totalPieceSold: -1, createdAt: -1 };
    case "popularity-desc":
    default:
      return { totalPieceSold: -1, createdAt: -1 };
  }
}

/* --------------------------- paging ------------------------ */
const getPagination = (q = {}) => {
  const rawPage = parseInt(q.page, 10);
  const rawLimit = parseInt(q.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  let limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;
  if (limit > 20) limit = 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const splitToIds = (v) => {
  if (!v) return null;
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

/* -------------------------------- GET ----------------------------- */
const getProducts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { stockStatus, from, to, q } = req.query; // 👈 q added

    // build filters
    const where = {};

    // stock status (skip invalid or when asking "all")
    if (
      stockStatus &&
      AVAILABILITY.includes(String(stockStatus).toLowerCase())
    ) {
      where.stockStatus = String(stockStatus).toLowerCase();
    }

    // date range on createdAt
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999); // inclusive end-of-day
        where.createdAt.$lte = end;
      }
    }

    // 🔍 text search on multiple fields (optional)
    if (q && String(q).trim()) {
      const term = String(q).trim();

      // case-insensitive regex
      const regex = new RegExp(term, "i");

      // mix with other filters is fine: Mongo will AND this $or with stockStatus/date
      where.$or = [
        { title: regex },
        { ar_title: regex },
        { description: regex },
        { ar_description: regex },
        { sku: regex },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(where)
        .populate(
          "brand categories type occasions recipients colors packagingOption suggestedProducts"
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(where),
    ]);

    if (products.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Products not found",
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasPrev: false,
          hasNext: false,
          prevPage: null,
          nextPage: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Products found successfully",
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById({ _id: id })
      .populate(
        "brand categories type occasions recipients colors packagingOption suggestedProducts"
      )
      .lean();

    if (!product) {
      return res
        .status(200)
        .json({ success: false, message: "Product not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Product found successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getProductsByFilters = async (req, res) => {
  try {
    // Collect & normalize query params
    const subCatQ = toList(req.query.subCategory);
    const occQ = toList(req.query.occasion);
    const brandQ = toList(req.query.brand);
    const recQ = toList(req.query.recipient);

    // free-text search (accept q or search)
    const rawSearch = (req.query.q ?? req.query.search ?? "").trim();

    const page = Math.max(1, parseInt(`${req.query.page || 1}`, 10));
    const limit = Math.max(1, parseInt(`${req.query.limit || 10}`, 10)); // default 10
    const skip = (page - 1) * limit;
    const sort = buildSort(req.query.sort);

    // Resolve to _ids (handle slugs or ids)
    const [subCategoryIds, occasionIds, brandIds, recipientIds] =
      await Promise.all([
        resolveIds(SubCategory, subCatQ),
        resolveIds(Occasion, occQ),
        resolveIds(Brand, brandQ),
        resolveIds(Recipient, recQ),
      ]);

    // Build filter
    const filter = { isActive: true }; // only active products by default
    if (subCategoryIds.length) filter.categories = { $in: subCategoryIds };
    if (occasionIds.length) filter.occasions = { $in: occasionIds };
    if (brandIds.length) filter.brand = { $in: brandIds };
    if (recipientIds.length) filter.recipients = { $in: recipientIds };

    // Add free-text search across title/ar_title/description/ar_description
    if (rawSearch) {
      const rx = new RegExp(escapeRegex(rawSearch), "i");
      filter.$or = [
        { title: rx },
        { ar_title: rx },
        { description: rx },
        { ar_description: rx },
      ];
    }

    // Count + query
    const [total, items] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate([
          { path: "brand", select: "name ar_name slug logo" },
          {
            path: "categories",
            select: "name ar_name slug parent",
            populate: {
              path: "parent",
              select: "name ar_name slug",
            },
          },
          { path: "occasions", select: "name ar_name slug" },
          { path: "recipients", select: "name ar_name slug" },
          { path: "colors", select: "name ar_name slug" },
        ])
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        docs: items,
        totalDocs: total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasPrevPage: page > 1,
        hasNextPage: page * limit < total,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getProductNames = async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    if (products.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Product not found" });
    }
    console.log("products", products);
    const names = products?.map((product) => ({
      title: product.title,
      _id: product._id,
    }));
    return res.status(200).json({ success: true, data: names });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Returns all products whose subcategory is "Flower in vases"
const getProductsInFlowerInVases = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const catIds = await subCategoryIdsByNames(["flowers in vases"]);

    const [products, total] = await Promise.all([
      Product.find({ categories: { $in: catIds } })
        .populate(
          "brand categories type occasions recipients colors packagingOption suggestedProducts"
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments({ categories: { $in: catIds } }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products (Flower in vases)",
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ----------------------------- 2) Top sold product ------------------------------ */
// Returns the (or top N) most sold product(s). Optional ?limit=n (default 1)
const getTopSoldProducts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [products, total] = await Promise.all([
      Product.find({})
        .sort({ totalPieceSold: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "brand categories type occasions recipients colors packagingOption suggestedProducts"
        )
        .lean(),
      Product.countDocuments({}), // total universe for top-sold list
    ]);

    return res.status(200).json({
      success: true,
      message: "Top sold products",
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* --------------- 3) Subcategory is Chocolates OR Hand Bouquets ------------------ */
// Returns products if subcategory matches either one of them
const getProductsInChocolatesOrHandBouquets = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const catIds = await subCategoryIdsByNames(["chocolates", "hand bouquets"]);

    const query = { categories: { $in: catIds } };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate(
          "brand categories type occasions recipients colors packagingOption suggestedProducts"
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products (Chocolates OR Hand Bouquets)",
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* -------------------------- 4) Occasion equals Friends -------------------------- */
// Returns products whose occasion contains "friends"
const getProductsForFriendsOccasion = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const recIds = await recipientIdsByNames(["friends"]);

    const query = { recipients: { $in: recIds } };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate(
          "brand categories type occasions recipients colors packagingOption suggestedProducts"
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products (Occasion: Friends)",
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ------------------------------ 5) Featured products ---------------------------- */
// Returns featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const query = { isFeatured: true, isActive: true };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate(
          "brand categories type occasions recipients colors packagingOption suggestedProducts"
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Featured products",
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ------------------------------ 6) Subcategory: Perfumes ------------------------ */
const getProductsInPerfumes = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const catIds = await subCategoryIdsByNames(["perfumes"]);

    const query = { categories: { $in: catIds } };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate(
          "brand categories type occasions recipients colors packagingOption suggestedProducts"
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products (Perfumes)",
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ------------------------- 7) Subcategory: Preserved Flowers -------------------- */
const getProductsInPreservedFlowers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const catIds = await subCategoryIdsByNames(["preserved flowers"]);

    const query = { categories: { $in: catIds } };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate(
          "brand categories type occasions recipients colors packagingOption suggestedProducts"
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products (Preserved Flowers)",
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Search Products
const getProductsBySearch = async (req, res) => {
  try {
    const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const {
      q = "",
      category = "",
      occasion = "",
      page = 1,
      limit = 12,
      sort = "newest",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);

    // Build base filter
    const filter = { isActive: true };

    // --- Explicit category/occasion filters via slug or id ---
    const parseList = (v) =>
      String(v || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const categoryKeys = parseList(category);
    const occasionKeys = parseList(occasion);

    // Resolve category IDs if provided
    if (categoryKeys.length) {
      const catIds = await SubCategory.find({
        $or: [
          { _id: { $in: categoryKeys.filter(mongoose.isValidObjectId) } },
          { slug: { $in: categoryKeys.map((s) => s.toLowerCase()) } },
        ],
      }).select("_id");
      if (catIds.length) filter.categories = { $in: catIds.map((d) => d._id) };
      else return res.json({ total: 0, page: pageNum, pages: 0, items: [] });
    }

    // Resolve occasion IDs if provided
    if (occasionKeys.length) {
      const occIds = await Occasion.find({
        $or: [
          { _id: { $in: occasionKeys.filter(mongoose.isValidObjectId) } },
          { slug: { $in: occasionKeys.map((s) => s.toLowerCase()) } },
        ],
      }).select("_id");
      if (occIds.length) filter.occasions = { $in: occIds.map((d) => d._id) };
      else return res.json({ total: 0, page: pageNum, pages: 0, items: [] });
    }

    // --- Free-text search across product fields + related names ---
    const or = [];
    if (q && q.trim().length) {
      const rx = new RegExp(escapeRegex(q.trim()), "i");

      // 1) Product own fields (EN + AR)
      or.push(
        { title: rx },
        { ar_title: rx },
        { description: rx },
        { ar_description: rx }
      );

      // 2) Match category by name and use ids in product filter
      const [catsByName, occsByName] = await Promise.all([
        SubCategory.find({
          $or: [{ name: rx }, { ar_name: rx }, { slug: rx }],
        }).select("_id"),
        Occasion.find({
          $or: [{ name: rx }, { ar_name: rx }, { slug: rx }],
        }).select("_id"),
      ]);

      if (catsByName.length) {
        or.push({ categories: { $in: catsByName.map((d) => d._id) } });
      }
      if (occsByName.length) {
        or.push({ occasions: { $in: occsByName.map((d) => d._id) } });
      }
    }

    const finalFilter = or.length ? { $and: [filter, { $or: or }] } : filter;

    // Sorting
    const sortMap = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      popular: { totalPieceSold: -1, createdAt: -1 },
    };
    const sortStage = sortMap[sort] || sortMap.newest;

    // Query + pagination
    const [items, total] = await Promise.all([
      Product.find(finalFilter)
        .populate([
          { path: "categories", select: "name ar_name slug parent" },
          { path: "occasions", select: "name ar_name slug" },
          { path: "brand", select: "name slug" },
        ])
        .sort(sortStage)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Product.countDocuments(finalFilter),
    ]);

    const pages = Math.ceil(total / pageSize);

    return res.json({
      total,
      page: pageNum,
      pages,
      items,
    });
  } catch (error) {
    console.error("getProductsBySearch error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createProduct = async (req, res) => {
  try {
    const b = req.body;

    // ---- price & discount ----
    const basePrice = toNum(b.price);          // ORIGINAL price
    let discount = toNum(b.discount, 0) || 0;  // flat discount amount

    if (basePrice == null) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: ["price is required and must be a number"],
      });
    }

    if (!Number.isFinite(discount) || discount < 0) discount = 0;

    // final price after discount (never below 0)
    const priceAfterDiscount = Math.max(0, basePrice - discount);

    // ---- stock fields ----
    const totalStocks = toNum(b.totalStocks);
    let remainingStocks = toNum(b.remainingStocks);
    const explicitTotalPieceSold = toNum(b.totalPieceSold);

    // if remaining not sent but total + totalPieceSold given -> derive remaining
    if (
      remainingStocks == null &&
      totalStocks != null &&
      explicitTotalPieceSold != null
    ) {
      remainingStocks = Math.max(0, totalStocks - explicitTotalPieceSold);
    }

    const doc = {
      title: b.title && String(b.title).trim(),
      ar_title: b.ar_title && String(b.ar_title).trim(),
      sku: b.sku && String(b.sku).trim(),
      description: b.description,
      ar_description: b.ar_description,
      qualities: pickArray(b, "qualities"),
      ar_qualities: pickArray(b, "ar_qualities"),

      // 🔹 pricing fields
      price: basePrice,                 // ORIGINAL price
      discount,                         // discount amount
      priceAfterDiscount,               // FINAL price after discount

      currency: b.currency || "QAR",
      totalStocks,
      remainingStocks,
      // ... (rest same as before)
      brand: normalizeId(b.brand),
      categories: normalizeIdArray(pickArray(b, "categories")),
      totalPieceCarry: toNum(b.totalPieceCarry),
      occasions: normalizeIdArray(pickArray(b, "occasions")),
      type: normalizeIdArray(pickArray(b, "type")),
      recipients: normalizeIdArray(pickArray(b, "recipients")),
      colors: normalizeIdArray(pickArray(b, "colors")),
      suggestedProducts: normalizeIdArray(pickArray(b, "suggestedProducts")),
      packagingOption: normalizeId(b.packagingOption),
      condition: b.condition || "new",
      isActive: toBool(b.isActive, true),
      isFeatured: toBool(b.isFeatured, false),
      dimensions: (() => {
        const { width, height } = pickDimensionsUpdate(b);
        const d = {};
        if (width !== undefined) d.width = width;
        if (height !== undefined) d.height = height;
        return d;
      })(),
      images: [],
    };

    /* --------- upload media (featured + gallery) ---------- */

    // featured image
    const featuredFile = req.files?.featuredImage?.[0];
    if (featuredFile) {
      const up = await cloudinary.uploader.upload(featuredFile.path, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      doc.featuredImage = up.secure_url;
    } else if (b.featuredImage) {
      doc.featuredImage = String(b.featuredImage);
    }

    // gallery images (+ existing urls)
    const galleryFiles = req.files?.images || [];
    const existingUrls = (() => {
      try {
        return JSON.parse(b.existingImageUrls || "[]");
      } catch (_) {
        return [];
      }
    })().filter(Boolean);

    if (galleryFiles.length) {
      for (const f of galleryFiles) {
        const up = await cloudinary.uploader.upload(f.path, {
          folder: "CRUNCHY COOKIES ASSETS",
        });
        existingUrls.push(up.secure_url);
      }
    }

    doc.images = existingUrls.map((url) => ({ url }));

    /* ---------------- required-field validation ---------------- */

    const errors = [];

    if (!doc.title) errors.push("title (English) is required");
    if (!doc.ar_title) errors.push("ar_title (Arabic) is required");
    if (!doc.sku) errors.push("sku is required");
    if (!doc.description) errors.push("description (English) is required");
    if (!doc.ar_description) errors.push("ar_description (Arabic) is required");

    if (!doc.featuredImage)
      errors.push("featuredImage is required (upload or URL)");
    if (!doc.images || doc.images.length === 0)
      errors.push("At least one gallery image is required");

    if (!doc.brand) errors.push("brand is required");
    if (!doc.categories || doc.categories.length === 0)
      errors.push("categories is required");
    if (!doc.type || doc.type.length === 0) errors.push("type is required");
    if (!doc.occasions || doc.occasions.length === 0)
      errors.push("occasions is required");
    if (!doc.recipients || doc.recipients.length === 0)
      errors.push("recipients is required");
    if (!doc.colors || doc.colors.length === 0)
      errors.push("colors is required");
    if (doc.totalPieceCarry == null) errors.push("totalPieceCarry is required");
    if (typeof doc.isActive !== "boolean") errors.push("isActive is required");

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    /* ---------------------- stock derivation --------------------- */

    const stockBaseTotal = doc.totalStocks || 0;

    // if still no remainingStocks but we know total -> assume all available
    if (doc.remainingStocks == null && stockBaseTotal) {
      doc.remainingStocks =
        explicitTotalPieceSold != null
          ? Math.max(0, stockBaseTotal - explicitTotalPieceSold)
          : stockBaseTotal;
    }

    // totalPieceSold:
    if (explicitTotalPieceSold != null) {
      doc.totalPieceSold = explicitTotalPieceSold;
    } else {
      const derived = deriveStock(stockBaseTotal, doc.remainingStocks);
      doc.totalPieceSold = derived.totalPieceSold;
      if (!doc.stockStatus) doc.stockStatus = derived.stockStatus;
    }

    // if client sent stockStatus explicitly, keep; otherwise ensure derived
    if (!doc.stockStatus) {
      const { stockStatus } = deriveStock(stockBaseTotal, doc.remainingStocks);
      doc.stockStatus = stockStatus;
    }

    /* ------------------------- create ---------------------------- */

    const created = await Product.create(doc);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: created,
    });
  } catch (err) {
    console.error("createProduct error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

/* -------------------------------- PUT ------------------------------ */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;

    console.log(b);

    const toUpdate = {};
    const toUnset = {};

    // ... (primitive fields, arrays, media etc. same as before)

    // ------- fetch current once (for price/discount and stock logic) -------
    const current = await Product.findById(id)
      .select("price discount priceAfterDiscount totalStocks remainingStocks totalPieceSold")
      .lean();

    if (!current) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // ------- price & discount logic (base price + priceAfterDiscount) ------
    if ("price" in b || "discount" in b) {
      // base/original price
      const basePrice =
        "price" in b ? toNum(b.price) : toNum(current.price);

      // discount amount
      let disc =
        "discount" in b ? toNum(b.discount, 0) : toNum(current.discount, 0);

      if (basePrice != null) {
        if (!Number.isFinite(disc) || disc < 0) disc = 0;

        const finalPrice = Math.max(0, basePrice - (disc || 0));

        // 🔹 keep ORIGINAL price in `price`
        toUpdate.price = basePrice;
        toUpdate.discount = disc || 0;
        toUpdate.priceAfterDiscount = finalPrice; // 🔹 discounted final price
      }
    }

    // --------- STOCK LOGIC (same as your current implementation) ----------
    {
      let total =
        "totalStocks" in b ? toNum(b.totalStocks) : (current.totalStocks ?? 0);

      const hasSoldFromBody =
        "totalPieceSold" in b && b.totalPieceSold !== undefined;
      let sold = hasSoldFromBody ? toNum(b.totalPieceSold) : undefined;

      const hasRemainFromBody =
        "remainingStocks" in b && b.remainingStocks !== undefined;
      let remain = hasRemainFromBody ? toNum(b.remainingStocks) : undefined;

      if (!Number.isFinite(total) || total < 0) total = 0;

      if (hasSoldFromBody) {
        if (!Number.isFinite(sold) || sold < 0) sold = 0;
        if (sold > total) sold = total;
        remain = Math.max(0, total - sold);

        toUpdate.totalStocks = total;
        toUpdate.totalPieceSold = sold;
        toUpdate.remainingStocks = remain;

        if (!("stockStatus" in b)) {
          const { stockStatus } = deriveStock(total, remain);
          toUpdate.stockStatus = stockStatus;
        }
      } else if (hasRemainFromBody) {
        if (!Number.isFinite(remain) || remain < 0) remain = 0;
        if (remain > total) remain = total;
        sold = Math.max(0, total - remain);

        toUpdate.totalStocks = total;
        toUpdate.remainingStocks = remain;
        toUpdate.totalPieceSold = sold;

        if (!("stockStatus" in b)) {
          const { stockStatus } = deriveStock(total, remain);
          toUpdate.stockStatus = stockStatus;
        }
      } else if ("totalStocks" in b) {
        const existingSold =
          typeof current.totalPieceSold === "number"
            ? current.totalPieceSold
            : Math.max(
                0,
                (current.totalStocks || 0) - (current.remainingStocks || 0)
              );

        const safeSold = Math.min(Math.max(existingSold, 0), total);
        const safeRemain = Math.max(0, total - safeSold);

        toUpdate.totalStocks = total;
        toUpdate.totalPieceSold = safeSold;
        toUpdate.remainingStocks = safeRemain;

        if (!("stockStatus" in b)) {
          const { stockStatus } = deriveStock(total, safeRemain);
          toUpdate.stockStatus = stockStatus;
        }
      }
    }

    const updateDoc =
      Object.keys(toUnset).length > 0
        ? { $set: toUpdate, $unset: toUnset }
        : { $set: toUpdate };

    console.log("updateDoc", updateDoc);

    const updated = await Product.findByIdAndUpdate(id, updateDoc, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("updateProduct error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteProduct = await Product.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Product deleted successfully",
      data: deleteProduct,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const deleteProduct = await Product.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Product deleted successfully",
      data: deleteProduct,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductsByFilters,
  getProductNames,
  getProductsBySearch,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDelete,
  // ⬇️ NEW exports
  getProductsInFlowerInVases,
  getTopSoldProducts,
  getProductsInChocolatesOrHandBouquets,
  getProductsForFriendsOccasion,
  getFeaturedProducts,
  getProductsInPerfumes,
  getProductsInPreservedFlowers,
};
