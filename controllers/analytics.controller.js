// controllers/analytics.controller.js
const Order = require("../models/Order.model");
const Product = require('../models/Product.model');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CUSTOMER_SATISFACTION = ['poor', 'extremely satisfied', 'satisfied', 'very poor']

const getOverview = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // optional time window on Order.createdAt
    const timeMatch = {};
    if (from || to) {
      timeMatch.createdAt = {};
      if (from) timeMatch.createdAt.$gte = new Date(from);
      if (to) timeMatch.createdAt.$lte = new Date(to);
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
      { $match: { ...timeMatch, payment: 'pending' } },
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

const getCurrentYearOrders = async (req, res) => {
  try {

    const year = new Date().getFullYear();
    const tz = 'UTC';

    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const match = { createdAt: { $gte: start, $lte: end }, status: "delivered" };

    const agg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            month: {
              $month: { date: `$createdAt`, timezone: 'UTC' }
            }
          },
          orders: { $sum: 1 },
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          orders: 1
        }
      },
      { $sort: { month: 1 } }
    ]);

    console.log("Aggregation Pipeline", agg);

    const byMonth = new Map(agg.map(r => [r.month, r]));
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const row = byMonth.get(m) || { orders: 0, amount: 0 };
      return { month: m, label: MONTHS[i], orders: row.orders };
    });

    return res.status(200).json({
      year,
      timezone: tz,
      monthly
    });

  } catch (error) {
    console.error('getCurrentYearOrders error:', error);
    res.status(500).json({ message: 'Failed to compute monthly orders', error: error.message });
  }
}

const getCustomersReviews = async (req, res) => {
  try {
    const pipeline = [
      // 1) normalize satisfaction -> lowercase trimmed string
      {
        $project: {
          sat: {
            $trim: { input: { $toLower: { $ifNull: ['$satisfaction', ''] } } }
          }
        }
      },
      // 2) keep only the known buckets
      { $match: { sat: { $in: CUSTOMER_SATISFACTION } } },

      // 3) single pass tally for each bucket + total
      {
        $group: {
          _id: null,
          total: { $sum: 1 },

          extremelySatisfied: {
            $sum: { $cond: [{ $eq: ['$sat', 'extremely satisfied'] }, 1, 0] }
          },
          satisfied: { $sum: { $cond: [{ $eq: ['$sat', 'satisfied'] }, 1, 0] } },
          poor: { $sum: { $cond: [{ $eq: ['$sat', 'poor'] }, 1, 0] } },
          veryPoor: { $sum: { $cond: [{ $eq: ['$sat', 'very poor'] }, 1, 0] } }
        }
      },

      // 4) shape into an array in the canonical order + compute % (rounded 1 dp)
      {
        $project: {
          _id: 0,
          total: 1,
          breakdown: [
            { k: 'extremely satisfied', count: '$extremelySatisfied' },
            { k: 'satisfied', count: '$satisfied' },
            { k: 'poor', count: '$poor' },
            { k: 'very poor', count: '$veryPoor' }
          ]
        }
      },
      { $unwind: '$breakdown' },
      {
        $addFields: {
          'breakdown.percent': {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$breakdown.count', '$total'] }, 100] }, 1] },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $first: '$total' },
          breakdown: { $push: '$breakdown' }
        }
      },
      { $project: { _id: 0, total: 1, breakdown: 1 } }
    ];

    const [doc] = await Order.aggregate(pipeline);

    // if no reviews yet, return zeros in the same shape
    const emptyBreakdown = CUSTOMER_SATISFACTION.map(k => ({ k, count: 0, percent: 0 }));

    const result = doc || { total: 0, breakdown: emptyBreakdown };

    // extra: chart-friendly series
    const labels = result.breakdown.map(b =>
      b.k.replace(/\b\w/g, ch => ch.toUpperCase()) // title-case for UI
    );

    return res.json({
      totalReviews: result.total,
      breakdown: result.breakdown,     // [{k, count, percent}]
      labels,                          // ['Extremely Satisfied', 'Satisfied', ...]
    });
  } catch (err) {
    console.error('getCustomersReviews error:', err);
    return res.status(500).json({
      message: 'Failed to compute customer reviews',
      error: err.message
    });
  }
};

const getSalesBreakdown = async (req, res) => {
  try {
    const tz = req.query.tz || 'UTC';
    const status = req.query.status || '';              // e.g. 'delivered' (empty = no filter)
    const dateField = req.query.dateField || 'createdAt';  // 'deliveredAt' if preferred

    const now = new Date();
    const fmt = (opt) => new Intl.DateTimeFormat('en', { timeZone: tz, ...opt }).format(now);
    const currentYear = parseInt(fmt({ year: 'numeric' }), 10);
    const currentMonth = parseInt(fmt({ month: 'numeric' }), 10); // 1..12
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const baseMatch = {};
    if (status) baseMatch.status = status;

    const pipeline = [
      { $match: baseMatch },
      {
        $facet: {
          // 1) Current Month — per day totals
          currentMonth: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $year: { date: `$${dateField}`, timezone: tz } }, currentYear] },
                    { $eq: [{ $month: { date: `$${dateField}`, timezone: tz } }, currentMonth] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: { day: { $dayOfMonth: { date: `$${dateField}`, timezone: tz } } },
                total: { $sum: { $ifNull: ['$totalAmount', 0] } }
              }
            },
            { $project: { _id: 0, day: '$_id.day', total: 1 } },
            { $sort: { day: 1 } }
          ],

          // 2) Current Year — per month totals
          currentYear: [
            {
              $match: {
                $expr: { $eq: [{ $year: { date: `$${dateField}`, timezone: tz } }, currentYear] }
              }
            },
            {
              $group: {
                _id: { month: { $month: { date: `$${dateField}`, timezone: tz } } },
                total: { $sum: { $ifNull: ['$totalAmount', 0] } }
              }
            },
            { $project: { _id: 0, month: '$_id.month', total: 1 } },
            { $sort: { month: 1 } }
          ],

          // 3) Overall — per year totals
          overall: [
            {
              $group: {
                _id: { year: { $year: { date: `$${dateField}`, timezone: tz } } },
                total: { $sum: { $ifNull: ['$totalAmount', 0] } }
              }
            },
            { $project: { _id: 0, year: '$_id.year', total: 1 } },
            { $sort: { year: 1 } }
          ]
        }
      }
    ];

    const [facet] = await Order.aggregate(pipeline);

    // Fill gaps and shape response
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Current month
    const dayMap = new Map((facet.currentMonth || []).map(r => [r.day, Number(r.total) || 0]));
    const cmDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const cmSales = cmDays.map(d => dayMap.get(d) || 0);

    // Current year
    const monMap = new Map((facet.currentYear || []).map(r => [r.month, Number(r.total) || 0]));
    const monthsIdx = Array.from({ length: 12 }, (_, i) => i + 1);
    const cySales = monthsIdx.map(m => monMap.get(m) || 0);

    // Overall (years)
    const yearsAgg = facet.overall || [];
    const firstYear = yearsAgg.length ? yearsAgg[0].year : currentYear;
    const lastYear = currentYear;
    const years = [];
    for (let y = firstYear; y <= lastYear; y++) years.push(y);
    const yearMap = new Map(yearsAgg.map(r => [r.year, Number(r.total) || 0]));
    const ovSales = years.map(y => yearMap.get(y) || 0);

    const sum = (arr) => arr.reduce((a, b) => a + b, 0);

    // no-store to ensure no caching in proxies/browsers
    res.set('Cache-Control', 'no-store');

    return res.json({
      timezone: tz,
      dateField,
      currentMonth: {
        year: currentYear,
        month: currentMonth,
        dates: cmDays.map(String),
        sales: cmSales,
        total: sum(cmSales)
      },
      currentYear: {
        year: currentYear,
        month: MONTHS,
        sales: cySales,
        total: sum(cySales)
      },
      overall: {
        startYear: firstYear,
        endYear: lastYear,
        year: years.map(String),
        sales: ovSales,
        total: sum(ovSales)
      }
    });
  } catch (err) {
    console.error('getSalesBreakdown error:', err);
    res.status(500).json({ message: 'Failed to compute sales breakdown', error: err.message });
  }
};

const getCountsOrdersAndSales = async (req, res) => {
  try {
    // Optional query params
    const status    = req.query.status || 'delivered';   // e.g. delivered
    const dateField = req.query.dateField || 'createdAt';// or 'deliveredAt'
    const from      = req.query.from ? new Date(req.query.from) : null; // '2025-01-01'
    const to        = req.query.to   ? new Date(req.query.to)   : null; // '2025-12-31'

    // Build match
    const match = {};
    if (status) match.status = status;
    if (from || to) {
      match[dateField] = {};
      if (from) match[dateField]['$gte'] = from;
      if (to)   match[dateField]['$lt']  = to;   // half-open interval
    }

    // Single aggregation for both counts
    const [doc = {}] = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          sales:  { $sum: { $ifNull: ['$totalAmount', 0] } }
        }
      },
      { $project: { _id: 0, orders: 1, sales: 1 } }
    ]);

    // Defaults if no docs
    const orders = doc.orders || 0;
    const sales  = Number(doc.sales || 0);

    // prevent caching
    res.set('Cache-Control', 'no-store');
    return res.json({ orders, sales, filters: { status, dateField, from, to } });
  } catch (error) {
    console.error('getCountsOrdersAndSales error:', error);
    return res.status(500).json({ message: 'Failed to compute counts', error: error.message });
  }
};

module.exports = {
  getOverview,
  getCurrentYearOrders,
  getCustomersReviews,
  getSalesBreakdown,
  getCountsOrdersAndSales
}