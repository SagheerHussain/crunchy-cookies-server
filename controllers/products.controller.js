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
    const { stockStatus, from, to } = req.query;

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
              path: "parent", // 👈 this is your Category reference
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

    const doc = {
      title: b.title,
      ar_title: b.ar_title,
      sku: b.sku,
      description: b.description,
      ar_description: b.ar_description,
      qualities: pickArray(b, "qualities"),
      ar_qualities: pickArray(b, "ar_qualities"),
      price: toNum(b.price),
      discount: toNum(b.discount, 0),
      currency: b.currency || "QAR",
      totalStocks: toNum(b.totalStocks),
      remainingStocks: toNum(b.remainingStocks),
      stockStatus: b.stockStatus,
      brand: normalizeId(b.brand),
      categories: normalizeIdArray(pickArray(b, "categories")),
      type: normalizeId(b.type),
      occasions: normalizeIdArray(pickArray(b, "occasions")),
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

    // media
    const featuredFile = req.files?.featuredImage?.[0];
    if (featuredFile) {
      const up = await cloudinary.uploader.upload(featuredFile.path, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      doc.featuredImage = up.secure_url;
    } else if (b.featuredImage) {
      doc.featuredImage = String(b.featuredImage);
    }

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

    // derived
    const { totalPieceSold, stockStatus } = deriveStock(
      doc.totalStocks,
      doc.remainingStocks
    );
    doc.totalPieceSold = totalPieceSold;
    if (!doc.stockStatus) doc.stockStatus = stockStatus;

    const created = await Product.create(doc);
    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: created,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* -------------------------------- PUT ------------------------------ */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;
    const toUpdate = {};
    const toUnset = {};

    // primitives
    if ("title" in b) toUpdate.title = b.title;
    if ("ar_title" in b) toUpdate.ar_title = b.ar_title;
    if ("description" in b) toUpdate.description = b.description;
    if ("ar_description" in b) toUpdate.ar_description = b.ar_description;
    if ("price" in b) toUpdate.price = toNum(b.price);
    if ("discount" in b) toUpdate.discount = toNum(b.discount, 0);
    if ("currency" in b) toUpdate.currency = b.currency;
    if ("totalStocks" in b) toUpdate.totalStocks = toNum(b.totalStocks);
    if ("remainingStocks" in b)
      toUpdate.remainingStocks = toNum(b.remainingStocks);
    if ("stockStatus" in b) toUpdate.stockStatus = b.stockStatus;
    if ("condition" in b) toUpdate.condition = b.condition;
    if ("isActive" in b) toUpdate.isActive = toBool(b.isActive, true);
    if ("isFeatured" in b) toUpdate.isFeatured = toBool(b.isFeatured, false);
    if ("sku" in b) toUpdate.sku = b.sku;

    // single refs with unset support
    if (b.unset_brand) toUnset.brand = "";
    else if ("brand" in b) {
      const v = normalizeId(b.brand);
      if (v !== undefined) toUpdate.brand = v;
    }

    if (b.unset_type) toUnset.type = "";
    else if ("type" in b) {
      const v = normalizeId(b.type);
      if (v !== undefined) toUpdate.type = v;
    }

    if (b.unset_packagingOption) toUnset.packagingOption = "";
    else if ("packagingOption" in b) {
      const v = normalizeId(b.packagingOption);
      if (v !== undefined) toUpdate.packagingOption = v;
    }

    if (b.unset_suggestedProducts) toUnset.suggestedProducts = "";
    else if ("suggestedProducts" in b) {
      const v = normalizeIdArray(pickArray(b, "suggestedProducts"));
      if (v !== undefined) toUpdate.suggestedProducts = v;
    }

    // arrays
    const arrKeys = [
      "qualities",
      "ar_qualities",
      "categories",
      "occasions",
      "recipients",
      "colors",
      "suggestedProducts",
    ];
    for (const k of arrKeys) {
      const present =
        k in b ||
        Object.keys(b).some((x) => x === `${k}[]` || x.startsWith(`${k}[`));
      if (!present) continue;

      if (k === "qualities") {
        const arr = pickArray(b, k)
          .map((s) => String(s).trim())
          .filter(Boolean);
        toUpdate[k] = arr;
      } else {
        const ids = normalizeIdArray(pickArray(b, k));
        if (ids !== undefined) toUpdate[k] = ids;
      }

      if (k === "ar_qualities") {
        const arr = pickArray(b, k)
          .map((s) => String(s).trim())
          .filter(Boolean);
        toUpdate[k] = arr;
      } else {
        const ids = normalizeIdArray(pickArray(b, k));
        if (ids !== undefined) toUpdate[k] = ids;
      }
    }

    // dimensions
    const { width, height } = pickDimensionsUpdate(b);
    if (width !== undefined) toUpdate["dimensions.width"] = width;
    if (height !== undefined) toUpdate["dimensions.height"] = height;

    // media
    const featuredFile = req.files?.featuredImage?.[0];
    const galleryFiles = req.files?.images || [];

    console.log(featuredFile);
    console.log(galleryFiles);

    if (featuredFile) {
      const up = await cloudinary.uploader.upload(featuredFile.path, {
        folder: "CRUNCHY COOKIES ASSETS",
      });
      toUpdate.featuredImage = up.secure_url;
    } else if (
      "featuredImage" in b &&
      b.featuredImage &&
      String(b.featuredImage).trim()
    ) {
      toUpdate.featuredImage = String(b.featuredImage).trim();
    }

    // merge gallery: accept new files + existing urls from client
    const keepUrls = (() => {
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
        keepUrls.push(up.secure_url);
      }
    } else if (
      "images" in b ||
      "images[]" in b ||
      Object.keys(b).some((k) => k.startsWith("images["))
    ) {
      // if client sent explicit images list, honor that (replace)
      const arr = pickArray(b, "images")
        .map((u) => String(u).trim())
        .filter(Boolean);
      toUpdate.images = arr.map((url) => ({ url }));
    }

    if (!("images" in toUpdate) && keepUrls.length) {
      toUpdate.images = keepUrls.map((url) => ({ url }));
    }

    // recompute derived if stocks changed
    if ("totalStocks" in toUpdate || "remainingStocks" in toUpdate) {
      const current = await Product.findById(id)
        .select("totalStocks remainingStocks")
        .lean();
      const total =
        "totalStocks" in toUpdate ? toUpdate.totalStocks : current?.totalStocks;
      const remain =
        "remainingStocks" in toUpdate
          ? toUpdate.remainingStocks
          : current?.remainingStocks;
      const { totalPieceSold, stockStatus } = deriveStock(total, remain);
      toUpdate.totalPieceSold = totalPieceSold;
      if (!("stockStatus" in b)) toUpdate.stockStatus = stockStatus;
    }

    const updateDoc = Object.keys(toUnset).length
      ? { $set: toUpdate, $unset: toUnset }
      : { $set: toUpdate };

    console.log(updateDoc);
    console.log(req.files);

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
    console.error(err);
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
