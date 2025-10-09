// controllers/product.controller.js
const Product = require("../models/Product.model");
const cloudinary = require("../config/cloudinary");

/* ------------------------- helpers ------------------------- */
const toNum  = (x, d = undefined) => (x == null || x === "" ? d : Number(x));
const toBool = (x, d = false) =>
  typeof x === "boolean" ? x : String(x).toLowerCase() === "true";

function maybeJSON(v) {
  if (v == null || v === "") return undefined;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return undefined; }
}

// Accept: key, key[], key[0] styles or JSON string
function pickArray(body, key) {
  if (Array.isArray(body[key])) return body[key];
  if (key in body) {
    const j = maybeJSON(body[key]);
    if (Array.isArray(j)) return j;
    return body[key] != null && body[key] !== "" ? [body[key]] : [];
  }
  return Object.keys(body)
    .filter(k => k === `${key}[]` || k.startsWith(`${key}[`))
    .sort()
    .map(k => body[k])
    .filter(v => v !== undefined && v !== null && v !== "");
}

function pickDimensionsCreate(body) {
  const direct = maybeJSON(body.dimensions) || body.dimensions || {};
  const w = body["dimensions[width]"]  ?? body['dimensions["width"]']  ?? direct.width;
  const h = body["dimensions[height]"] ?? body['dimensions["height"]'] ?? direct.height;
  const width  = toNum(w);
  const height = toNum(h);
  const out = {};
  if (width  !== undefined) out.width  = width;
  if (height !== undefined) out.height = height;
  return Object.keys(out).length ? out : undefined;
}

// dimensions from multipart (update) — returns numbers (or undefined) separately
function pickDimensionsUpdate(body) {
  const direct = maybeJSON(body.dimensions) || body.dimensions || {};
  const w = body["dimensions[width]"]  ?? body['dimensions["width"]']  ?? direct.width;
  const h = body["dimensions[height]"] ?? body['dimensions["height"]'] ?? direct.height;
  return { width: toNum(w), height: toNum(h) };
}

function deriveStock(total, remaining) {
  const t = Number(total ?? 0);
  const r = Number(remaining ?? 0);
  const sold = Math.max(0, t - r);
  let status = "in_stock";
  if (r === 0) status = "out_of_stock";
  else if (r > 0 && r < 10) status = "low_stock";
  return { totalPieceSold: sold, stockStatus: status };
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
  return String(v).split(",").map(s => s.trim()).filter(Boolean);
};

/* -------------------------------- GET ----------------------------- */
const getProducts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [products, total] = await Promise.all([
      Product.find()
        .populate("brand categories type occasions recipients colors packagingOption suggestedProducts")
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments({})
    ]);

    if (products.length === 0) {
      return res.status(200).json({ success: false, message: "Products not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Products found successfully",
      data: products,
      meta: {
        page, limit, total, totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById({ _id: id })
      .populate("brand categories type occasions recipients colors packagingOption suggestedProducts")
      .lean();

    if (!product) {
      return res.status(200).json({ success: false, message: "Product not found" });
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

const getFilteredProducts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const {
      category, categories, occasion, recipient, color,
      packagingOption, priceLabel, minPrice, maxPrice, sort
    } = req.query;

    const query = {};
    const catIds = splitToIds(category || categories);
    const occIds = splitToIds(occasion);
    const recIds = splitToIds(recipient);
    const colIds = splitToIds(color);

    if (catIds?.length) query.categories = { $in: catIds };
    if (occIds?.length) query.occasions = { $in: occIds };
    if (recIds?.length) query.recipients = { $in: recIds };
    if (colIds?.length) query.colors = { $in: colIds };
    if (packagingOption) query.packagingOption = packagingOption;

    if (minPrice != null || maxPrice != null) {
      query.price = {};
      if (minPrice != null) query.price.$gte = Number(minPrice);
      if (maxPrice != null) query.price.$lte = Number(maxPrice);
    }

    let sortObj = {};
    if (priceLabel === "low_to_high") sortObj.price = 1;
    if (priceLabel === "high_to_low") sortObj.price = -1;
    if (sort === "newest") sortObj.createdAt = -1;
    if (sort === "oldest") sortObj.createdAt = 1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortObj)
        .populate("brand categories type occasions recipients colors packagingOption suggestedProducts")
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    if (products.length === 0) {
      return res.status(200).json({
        success: false,
        message: "Product not found",
        meta: {
          page, limit, total, totalPages: Math.ceil(total / limit) || 0,
          hasPrev: page > 1,
          hasNext: page * limit < total,
          prevPage: page > 1 ? page - 1 : null,
          nextPage: page * limit < total ? page + 1 : null,
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product found successfully",
      data: products,
      meta: {
        page, limit, total, totalPages: Math.ceil(total / limit),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < total ? page + 1 : null,
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createProduct = async (req, res) => {
  try {
    const b = req.body;

    // files
    const featuredFile = req.files?.featuredImage?.[0] || null;
    const galleryFiles = req.files?.images || [];

    let featuredImageUrl = b.featuredImage || null;
    if (featuredFile) {
      const up = await cloudinary.uploader.upload(featuredFile.path, { folder: "CRUNCHY COOKIES ASSETS" });
      featuredImageUrl = up.secure_url;
    }
    const imageUrls = [];
    for (const f of galleryFiles) {
      const up = await cloudinary.uploader.upload(f.path, { folder: "CRUNCHY COOKIES ASSETS" });
      imageUrls.push(up.secure_url);
    }
    const images = imageUrls.map(url => ({ url }));

    // arrays
    const qualities         = pickArray(b, "qualities");
    const categories        = pickArray(b, "categories");
    const occasions         = pickArray(b, "occasions");
    const recipients        = pickArray(b, "recipients");
    const colors            = pickArray(b, "colors");
    const suggestedProducts = pickArray(b, "suggestedProducts");

    // numbers / booleans / dimensions
    const totalStocks     = toNum(b.totalStocks, 0);
    const remainingStocks = b.remainingStocks != null ? toNum(b.remainingStocks) : totalStocks;
    const dimensions      = pickDimensionsCreate(b);

    const { totalPieceSold, stockStatus } = deriveStock(totalStocks, remainingStocks);

    const payload = {
      title: b.title,
      description: b.description,
      qualities,
      price: toNum(b.price),
      discount: toNum(b.discount, 0),
      currency: b.currency || "QAR",
      totalStocks,
      remainingStocks,
      totalPieceSold,
      stockStatus,                    // auto
      brand: b.brand || null,
      categories,
      type: b.type || null,
      occasions,
      recipients,
      colors,
      packagingOption: b.packagingOption || null,
      condition: b.condition || "new",
      featuredImage: featuredImageUrl,
      images,
      suggestedProducts,
      isActive:   toBool(b.isActive, true),
      isFeatured: toBool(b.isFeatured, false),
      sku: b.sku,
    };

    if (dimensions) payload.dimensions = dimensions;

    const created = await Product.create(payload);
    res.status(201).json({ success: true, message: "Product created successfully", data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ------------------------------ */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;
    const toUpdate = {};

    // primitives
    if ("title" in b) toUpdate.title = b.title;
    if ("description" in b) toUpdate.description = b.description;
    if ("price" in b) toUpdate.price = toNum(b.price);
    if ("discount" in b) toUpdate.discount = toNum(b.discount, 0);
    if ("currency" in b) toUpdate.currency = b.currency;
    if ("totalStocks" in b) toUpdate.totalStocks = toNum(b.totalStocks);
    if ("remainingStocks" in b) toUpdate.remainingStocks = toNum(b.remainingStocks);
    if ("stockStatus" in b) toUpdate.stockStatus = b.stockStatus; // optional manual override
    if ("brand" in b) toUpdate.brand = b.brand;
    if ("type" in b) toUpdate.type = b.type;
    if ("packagingOption" in b) toUpdate.packagingOption = b.packagingOption;
    if ("condition" in b) toUpdate.condition = b.condition;
    if ("isActive" in b) toUpdate.isActive = toBool(b.isActive, true);
    if ("isFeatured" in b) toUpdate.isFeatured = toBool(b.isFeatured, false);
    if ("sku" in b) toUpdate.sku = b.sku;

    // arrays
    for (const k of ["qualities","categories","occasions","recipients","colors","suggestedProducts"]) {
      const present = (k in b) || Object.keys(b).some(x => x === `${k}[]` || x.startsWith(`${k}[`));
      if (present) toUpdate[k] = pickArray(b, k);
    }

    // dimensions: only set subfields that actually came
    const { width, height } = pickDimensionsUpdate(b);
    if (width  !== undefined) toUpdate["dimensions.width"]  = width;
    if (height !== undefined) toUpdate["dimensions.height"] = height;

    // files
    const featuredFile = req.files?.featuredImage?.[0];
    const galleryFiles = req.files?.images || [];

    if (featuredFile) {
      const up = await cloudinary.uploader.upload(featuredFile.path, { folder: "CRUNCHY COOKIES ASSETS" });
      toUpdate.featuredImage = up.secure_url;
    } else if ("featuredImage" in b && b.featuredImage) {
      toUpdate.featuredImage = b.featuredImage; // URL allowed
    }

    if (galleryFiles.length) {
      const urls = [];
      for (const f of galleryFiles) {
        const up = await cloudinary.uploader.upload(f.path, { folder: "CRUNCHY COOKIES ASSETS" });
        urls.push(up.secure_url);
      }
      toUpdate.images = urls.map(url => ({ url }));
    } else if ("images" in b || "images[]" in b || Object.keys(b).some(k => k.startsWith("images["))) {
      const arr = pickArray(b, "images").map(u => (typeof u === "string" ? { url: u } : u)).filter(Boolean);
      toUpdate.images = arr;
    }

    // --- derived fields: if totalStocks or remainingStocks came, recompute ---
    if ("totalStocks" in toUpdate || "remainingStocks" in toUpdate) {
      // get the current values to combine with provided ones
      const current = await Product.findById(id).select("totalStocks remainingStocks").lean();
      const total = ("totalStocks" in toUpdate) ? toUpdate.totalStocks : current?.totalStocks;
      const remain = ("remainingStocks" in toUpdate) ? toUpdate.remainingStocks : current?.remainingStocks;
      const { totalPieceSold, stockStatus } = deriveStock(total, remain);
      toUpdate.totalPieceSold = totalPieceSold;
      // only override stockStatus if user didn’t explicitly set it
      if (!("stockStatus" in b)) {
        toUpdate.stockStatus = stockStatus;
      }
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: toUpdate },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ success: true, message: "Product updated successfully", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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
  getFilteredProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDelete,
};
