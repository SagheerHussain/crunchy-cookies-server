// controllers/analytics.controller.js
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');

exports.getOverview = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // optional time window on Order.createdAt
    const timeMatch = {};
    if (from || to) {
      timeMatch.createdAt = {};
      if (from) timeMatch.createdAt.$gte = new Date(from);
      if (to)   timeMatch.createdAt.$lte = new Date(to);
    }

    // 1) Orders Delivered (count)
    const ordersDeliveredPromise = Order.countDocuments({
      ...timeMatch,
      status: 'delivered',
    });

    // 2) Total Products (active)
    const totalProductsPromise = Product.countDocuments({ isActive: { $ne: false } });

    // 3) Products Sold (sum of totalPieceSold across products)
    const productsSoldPromise = Product.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: null, sold: { $sum: { $toDouble: { $ifNull: ['$totalPieceSold', 0] } } } } },
      { $project: { _id: 0, sold: 1 } },
    ]).then(r => r[0]?.sold || 0);

    // 4) Expected Amount = sum of totalAmount for ALL orders (regardless of payment)
    const expectedAmountPromise = Order.aggregate([
      { $match: { ...timeMatch } },
      { $group: { _id: null, amt: { $sum: { $toDouble: { $ifNull: ['$totalAmount', 0] } } } } },
      { $project: { _id: 0, amt: 1 } },
    ]).then(r => Number(r[0]?.amt || 0));

    // 5) Net Profit (collected revenue) = sum totalAmount where payment === 'paid'
    const netProfitPromise = Order.aggregate([
      { $match: { ...timeMatch, payment: 'paid' } },
      { $group: { _id: null, amt: { $sum: { $toDouble: { $ifNull: ['$totalAmount', 0] } } } } },
      { $project: { _id: 0, amt: 1 } },
    ]).then(r => Number(r[0]?.amt || 0));

    const [ordersDelivered, totalProducts, productsSold, expectedAmount, netProfit] =
      await Promise.all([
        ordersDeliveredPromise,
        totalProductsPromise,
        productsSoldPromise,
        expectedAmountPromise,
        netProfitPromise,
      ]);

    res.json({
      success: true,
      data: {
        netProfit,          // e.g. 187001  -> UI me $ + format
        ordersDelivered,    // e.g. 21345
        totalProducts,      // e.g. 7321
        productsSold,       // e.g. 81987
        expectedAmount,     // ALL orders ka total
      },
    });
  } catch (err) {
    next(err);
  }
};
