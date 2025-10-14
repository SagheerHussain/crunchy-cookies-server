// services/orderToSheet.js
const { upsertRowByKey, ensureHeaderRow } = require("../utils/googleSheets");

// Keep this in .env for flexibility
// .env: SHEETS_SPREADSHEET_ID=1GJ5Gfe_37oO7UIzJ0yFaEiafX-BdrSd65o9emijLKzQ
// .env: SHEETS_ORDERS_TAB=Orders
const SPREADSHEET_ID = process.env.SHEETS_SPREADSHEET_ID || "1GJ5Gfe_37oO7UIzJ0yFaEiafX-BdrSd65o9emijLKzQ";
const SHEET_NAME = process.env.SHEETS_ORDERS_TAB || "Orders";

// Match exactly what your sheet shows (order matters!)
const HEADERS = [
  "Code",
  "Created At",
  "Delivered At",
  "Placed At",
  "Status",
  "Payment",
  "Customer",
  "Sender Phone",
  "Receiver Phone",
  "Subtotal",
  "Discount %",
  "Tax",
  "Shipping",
  "Coupon",
  "Grand Total",
  "Delivery Notes",
  "Card Message",
  "Card Image",
];

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const money = (n, cur = "QAR") => (n == null ? "" : `${cur} ${Number(n || 0).toLocaleString()}`);

function getPhones(order) {
  // Adjust if your Address schema differs
  const senderPhone = order?.shippingAddress?.senderPhone || order?.shippingAddress?.phone || "";
  const receiverPhone = order?.shippingAddress?.receiverPhone || order?.shippingAddress?.phone2 || "";
  return { senderPhone, receiverPhone };
}

function getCustomer(order) {
  const fn = order?.user?.firstname || order?.user?.firstName || "";
  const ln = order?.user?.lastname || order?.user?.lastName || "";
  return `${fn} ${ln}`.trim() || order?.user?.email || "";
}

function calcSubtotal(order) {
  // If you store items with totals, sum them; else fallback to totalAmount minus tax/ship/discount
  try {
    const products = Array.isArray(order?.items?.products)
      ? order.items.products
      : [];
    if (products.length) {
      return products.reduce((s, p) => s + Number(p?.totalAmount || p?.price || 0), 0);
    }
  } catch (_) {}
  return Number(order?.subtotal ?? 0);
}

function calcDiscountPercent(order) {
  // If you store percentage—great; else infer if coupon has percentage value
  const raw = order?.discountPercent ?? order?.discount ?? "";
  return raw ? `${raw}%` : (order?.appliedCoupon?.type === "percent" ? `${order?.appliedCoupon?.value || 0}%` : "");
}

function calcGrandTotal(order) {
  const subtotal = Number(calcSubtotal(order) || 0);
  const tax = Number(order?.taxAmount || 0);
  const shipping = Number(order?.shippingAmount || 0);
  const discountPct = Number(String(calcDiscountPercent(order)).replace("%", "") || 0);
  const afterDiscount = subtotal * (1 - discountPct / 100);
  return Math.round(afterDiscount + tax + shipping);
}

function buildRow(order) {
  const { senderPhone, receiverPhone } = getPhones(order);
  const customer = getCustomer(order);

  return [
    order?.code || "",                                  // Code
    fmtDate(order?.createdAt || Date.now()),            // Created At
    fmtDate(order?.deliveredAt),                        // Delivered At
    fmtDate(order?.placedAt || order?.createdAt),       // Placed At
    order?.status || "pending",                         // Status
    order?.payment || "pending",                        // Payment
    customer,                                           // Customer
    senderPhone,                                        // Sender Phone
    receiverPhone,                                      // Receiver Phone
    money(calcSubtotal(order)),                         // Subtotal
    calcDiscountPercent(order),                         // Discount %
    money(order?.taxAmount),                            // Tax
    money(order?.shippingAmount || 0),                  // Shipping
    order?.appliedCoupon?.code || order?.appliedCoupon || "", // Coupon
    money(calcGrandTotal(order)),                       // Grand Total
    order?.deliveryInstructions || "",                  // Delivery Notes
    order?.cardMessage || "",                           // Card Message
    order?.cardImage || "",                             // Card Image
  ];
}

/**
 * Upsert the order into Google Sheets by Code.
 * - safe: logs and continues if API fails (doesn't block HTTP response)
 */
async function pushOrderToSheet(order) {
  if (!order?.code) {
    console.warn("[pushOrderToSheet] Missing order.code — skipping.");
    return;
  }

  // Make sure header row exists (first run safety)
  await ensureHeaderRow({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
    headers: HEADERS,
  });

  const rowValues = buildRow(order);

  const res = await upsertRowByKey({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
    headers: HEADERS,
    keyColumnName: "Code",
    keyValue: order.code,
    rowValues,
  });

  console.log(`[Sheets] ${res.action} row ${res.rowIndex} for Code=${order.code}`);
}

module.exports = { pushOrderToSheet, HEADERS };
