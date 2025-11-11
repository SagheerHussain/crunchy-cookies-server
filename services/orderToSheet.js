// services/orderToSheet.js
const { upsertRowByKey, ensureHeaderRow } = require("../utils/googleSheets");

const SPREADSHEET_ID =
  process.env.SHEETS_SPREADSHEET_ID ||
  "1GJ5Gfe_37oO7UIzJ0yFaEiafX-BdrSd65o9emijLKzQ";
const SHEET_NAME = process.env.SHEETS_ORDERS_TAB || "Orders";

/**
 * FINAL layout (create + update dono isi ko use karen)
 *
 * Code | Delivered At | Placed At | Status | Payment | Customer
 *      | Sender Phone | Subtotal | Delivery Charges | Grand Total | Card Image
 */
const HEADERS = [
  "Code",
  "Delivered At",
  "Placed At",
  "Status",
  "Payment",
  "Customer",
  "Sender Phone",
  "Subtotal",
  "Delivery Charges",
  "Grand Total",
  "Card Image",
];

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10); // 2025-11-11
};

const money = (n, cur = "QAR") =>
  n == null ? "" : `${cur} ${Number(n || 0).toLocaleString()}`;

const safeSheetText = (v) => {
  if (v == null) return "";
  const s = String(v);
  return s.startsWith("=") || s.startsWith("+") || s.startsWith("-")
    ? `'${s}`
    : s;
};

function getCustomer(order) {
  const u = order?.user || {};
  const fn = u.firstname || u.firstName || "";
  const ln = u.lastname || u.lastName || "";
  const name = `${fn} ${ln}`.trim();
  return name || u.email || "";
}

function calcSubtotal(order) {
  if (order?.subtotalAmount != null) return Number(order.subtotalAmount);
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items.reduce(
      (sum, it) => sum + Number(it?.totalAmount || 0),
      0
    );
  }
  return 0;
}

function calcDeliveryCharges(order) {
  if (order?.taxAmount != null) return Number(order.taxAmount);
  return Number(order?.deliveryCharges || order?.shippingAmount || 0);
}

function calcGrandTotal(order) {
  if (order?.grandTotal != null) return Number(order.grandTotal);
  const subtotal = calcSubtotal(order);
  const delivery = calcDeliveryCharges(order);
  return Math.round(subtotal + delivery);
}

function buildRow(order) {
  const customer = getCustomer(order);
  const payment = order?.payment || order?.paymentStatus || "pending";
  const senderPhone =
    order?.senderPhone || order?.shippingAddress?.senderPhone || "";

  const subtotal = calcSubtotal(order);
  const deliveryCharges = calcDeliveryCharges(order);
  const grandTotal = calcGrandTotal(order);

  // Placed At: use existing placedAt; fallback createdAt; last resort: now
  const placedAt = order?.placedAt || order?.createdAt || Date.now();

  return [
    order?.code || "",                   // Code
    fmtDate(order?.deliveredAt),         // Delivered At
    fmtDate(placedAt),                   // Placed At
    order?.status || "pending",          // Status
    payment,                             // Payment
    customer,                            // Customer
    safeSheetText(senderPhone),          // Sender Phone
    money(subtotal),                     // Subtotal
    money(deliveryCharges),              // Delivery Charges
    money(grandTotal),                   // Grand Total
    order?.cardImage || "",              // Card Image
  ];
}

async function pushOrderToSheet(order) {
  try {
    if (!order?.code) {
      console.warn("[pushOrderToSheet] Missing order.code — skipping.");
      return;
    }

    console.log("sheet payload", order)

    await ensureHeaderRow({
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      headers: HEADERS,
    });

    const rowValues = buildRow(order);

    await upsertRowByKey({
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      headers: HEADERS,
      keyColumnName: "Code",
      keyValue: order.code,
      rowValues,
    });
  } catch (err) {
    console.error(
      "[pushOrderToSheet] error:",
      err?.response?.data || err?.message || err
    );
  }
}

module.exports = { pushOrderToSheet, HEADERS };
