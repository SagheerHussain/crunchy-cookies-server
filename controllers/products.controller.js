const Product = require("../models/Product.model");

const getPagination = (q = {}) => {
  const rawPage  = parseInt(q.page, 10);
  const rawLimit = parseInt(q.limit, 10);

  const page  = Number.isFinite(rawPage)  && rawPage  > 0 ? rawPage  : 1;
  let   limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;

  // hard cap = 20
  if (limit > 20) limit = 20;

  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const splitToIds = (v) => {
  if (!v) return null;
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
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
      return res.status(200).json({
        success: false,
        message: "Products not found",
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
      .populate("brand")
      .populate("categories")
      .populate("type")
      .populate("occasions")
      .populate("recipients")
      .populate("colors")
      .populate("packagingOption")
      .populate("suggestedProducts")
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

const getFilteredProducts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const {
      category, categories, occasion, recipient, color,
      packagingOption, priceLabel, minPrice, maxPrice, sort
    } = req.query;

    const query = {};

    // multi-select support (comma separated or repeated params)
    const catIds  = splitToIds(category || categories);
    const occIds  = splitToIds(occasion);
    const recIds  = splitToIds(recipient);
    const colIds  = splitToIds(color);

    if (catIds?.length) query.categories = { $in: catIds };
    if (occIds?.length) query.occasions  = { $in: occIds };
    if (recIds?.length) query.recipients = { $in: recIds };
    if (colIds?.length) query.colors     = { $in: colIds };

    if (packagingOption) query.packagingOption = packagingOption;

    // price range (optional)
    if (minPrice != null || maxPrice != null) {
      query.price = {};
      if (minPrice != null) query.price.$gte = Number(minPrice);
      if (maxPrice != null) query.price.$lte = Number(maxPrice);
    }

    // sorting
    let sortObj = {};
    if (priceLabel === "low_to_high") sortObj.price = 1;
    if (priceLabel === "high_to_low") sortObj.price = -1;

    // optional createdAt sorting
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
    // parse body (multipart fields may be strings)
    const body = req.body;

    const qualities = parseMaybeJSON(body.qualities, []);
    const categories = parseMaybeJSON(body.categories, []);
    const occasions = parseMaybeJSON(body.occasions, []);
    const recipients = parseMaybeJSON(body.recipients, []);
    const colors = parseMaybeJSON(body.colors, []);
    const dimensions = parseMaybeJSON(body.dimensions, {});

    // files from multer
    const featured = req.files?.featuredImage?.[0];
    const gallery = req.files?.images || [];

    const featuredImage = fileToPublicUrl(featured);
    const images = gallery.map(f => ({ url: fileToPublicUrl(f) }));

    // IMPORTANT: remainingStocks required by schema
    const totalStocks = Number(body.totalStocks ?? 0);
    const remainingStocks = body.remainingStocks != null
      ? Number(body.remainingStocks)
      : totalStocks; // default = totalStocks

    const payload = {
      title: body.title,
      description: body.description,
      qualities,
      price: body.price,
      discount: body.discount ?? 0,
      currency: body.currency || 'QAR',
      totalStocks,
      remainingStocks,
      stockStatus: body.stockStatus || 'in_stock',
      brand: body.brand || null,
      categories,
      type: body.type || null,
      occasions,
      recipients,
      colors,
      packagingOption: body.packagingOption || null,
      condition: body.condition || 'new',
      featuredImage,  // single
      images,         // [{url}]
      suggestedProducts: parseMaybeJSON(body.suggestedProducts, []),
      isActive: body.isActive != null ? body.isActive : true,
      isFeatured: body.isFeatured != null ? body.isFeatured : false,
      sku: body.sku,
      dimensions
    };

    const created = await Product.create(payload);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: created,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ------------------------------ */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // parse multi-value fields (if provided)
    const toUpdate = {};
    if (body.title != null) toUpdate.title = body.title;
    if (body.description != null) toUpdate.description = body.description;
    if (body.qualities != null) toUpdate.qualities = parseMaybeJSON(body.qualities, []);
    if (body.price != null) toUpdate.price = body.price;
    if (body.discount != null) toUpdate.discount = body.discount;
    if (body.currency != null) toUpdate.currency = body.currency;
    if (body.totalStocks != null) toUpdate.totalStocks = Number(body.totalStocks);
    if (body.remainingStocks != null) toUpdate.remainingStocks = Number(body.remainingStocks);
    if (body.stockStatus != null) toUpdate.stockStatus = body.stockStatus;
    if (body.brand != null) toUpdate.brand = body.brand;
    if (body.categories != null) toUpdate.categories = parseMaybeJSON(body.categories, []);
    if (body.type != null) toUpdate.type = body.type;
    if (body.occasions != null) toUpdate.occasions = parseMaybeJSON(body.occasions, []);
    if (body.recipients != null) toUpdate.recipients = parseMaybeJSON(body.recipients, []);
    if (body.colors != null) toUpdate.colors = parseMaybeJSON(body.colors, []);
    if (body.packagingOption != null) toUpdate.packagingOption = body.packagingOption;
    if (body.condition != null) toUpdate.condition = body.condition;
    if (body.suggestedProducts != null) toUpdate.suggestedProducts = parseMaybeJSON(body.suggestedProducts, []);
    if (body.isActive != null) toUpdate.isActive = body.isActive;
    if (body.isFeatured != null) toUpdate.isFeatured = body.isFeatured;
    if (body.sku != null) toUpdate.sku = body.sku;
    if (body.dimensions != null) toUpdate.dimensions = parseMaybeJSON(body.dimensions, {});

    // files from multer
    const featured = req.files?.featuredImage?.[0];
    const gallery = req.files?.images || [];

    if (featured) {
      toUpdate.featuredImage = fileToPublicUrl(featured);
    }

    if (gallery.length) {
      // overwrite images with newly uploaded ones
      toUpdate.images = gallery.map(f => ({ url: fileToPublicUrl(f) }));
    }

    const updated = await Product.findByIdAndUpdate(id, toUpdate, { new: true });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updated,
    });
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
    const deleteProduct = await Product.deleteMany({
      _id: { $in: ids },
    });

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
