// services/orderToSheet.js
const { upsertRowByKey, ensureHeaderRow } = require("../utils/googleSheets");

const SPREADSHEET_ID =
  process.env.SHEETS_SPREADSHEET_ID || "1GJ5Gfe_37oO7UIzJ0yFaEiafX-BdrSd65o9emijLKzQ";
const SHEET_NAME = process.env.SHEETS_ORDERS_TAB || "Orders";

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
  "Delivery Charges",
  "Coupon",
  "Grand Total",
  "Card Message",
  "Card Image",
];

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const money = (n, cur = "QAR") =>
  n == null ? "" : `${cur} ${Number(n || 0).toLocaleString()}`;

const safeSheetText = (v) => {
  if (v == null) return "";
  const s = String(v);
  return s.startsWith("=") || s.startsWith("+") || s.startsWith("-") ? `'${s}` : s;
};

function getPhones(order) {
  return {
    senderPhone: order?.shippingAddress?.senderPhone,
    receiverPhone: order?.shippingAddress?.receiverPhone,
  };
}
function getCustomer(order) {
  const fn = order?.user?.firstname || order?.user?.firstName || "";
  const ln = order?.user?.lastname || order?.user?.lastName || "";
  return `${fn} ${ln}`.trim() || order?.user?.email || "";
}

function calcSubtotal(order) {
  if (order?.totalAmount != null) return Number(order.totalAmount);
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items.reduce((sum, it) => sum + Number(it?.totalAmount || 0), 0);
  }
  return 0;
}

function calcDiscountPercent(order) {
  if (order?.discountPercent != null) return `${order.discountPercent}%`;
  const type = order?.appliedCoupon?.type;
  const val = order?.appliedCoupon?.value;
  if (type === "percentage" && val != null) return `${val}%`;
  return "";
}

function calcGrandTotal(order) {
  if (order?.grandTotal != null) return Number(order.grandTotal);
  const subtotal = calcSubtotal(order);
  const shipping = Number(order?.deliveryCharges || order?.shippingAmount || 0);
  const discountPct = Number(String(calcDiscountPercent(order)).replace("%", "") || 0);
  const afterDiscount = subtotal * (1 - discountPct / 100);
  return Math.round(afterDiscount + shipping);
}

function buildRow(order) {
  const { senderPhone, receiverPhone } = getPhones(order);
  const customer = getCustomer(order);
  const payment = order?.paymentStatus || order?.payment || "pending";

  return [
    order?.code || "",
    fmtDate(order?.createdAt || Date.now()),
    fmtDate(order?.deliveredAt),
    fmtDate(order?.placedAt || order?.createdAt),
    order?.status || "pending",
    payment,
    customer,
    safeSheetText(senderPhone),
    safeSheetText(receiverPhone),
    money(calcSubtotal(order)),
    calcDiscountPercent(order),
    money(order?.taxAmount || 0), // ✅ matches "Delivery Charges"
    order?.appliedCoupon?.code || order?.appliedCoupon || "",
    money(calcGrandTotal(order)),
    order?.cardMessage || "",
    order?.cardImage || "",
  ];
}

async function pushOrderToSheet(order) {
  try {
    if (!order?.code) {
      console.warn("[pushOrderToSheet] Missing order.code — skipping.");
      return;
    }

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
  } catch (err) {
    // Log the useful Google API body if present
    console.error("[pushOrderToSheet] error:", err?.response?.data || err);
  }
}

module.exports = { pushOrderToSheet, HEADERS };
