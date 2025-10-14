// utils/googleSheets.js
const { google } = require("googleapis");
const path = require("path");

let _client, _sheets;

// Convert 1-based col index to A1 letter(s)
const colToA1 = (n) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

async function getSheets() {
  if (_sheets) return _sheets;

  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve("credentials.json");
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  _client = await auth.getClient();
  _sheets = google.sheets({ version: "v4", auth: _client });
  return _sheets;
}

async function ensureHeaderRow({ spreadsheetId, sheetName, headers }) {
  const sheets = await getSheets();

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });

  const existing = current.data.values?.[0] || [];
  const same =
    existing.length === headers.length &&
    headers.every((h, i) => String(existing[i] || "").trim() === String(h).trim());

  if (!same) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:${colToA1(headers.length)}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  }
}

async function getAllRows({ spreadsheetId, sheetName }) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}`,
  });
  return res.data.values || [];
}

/**
 * Upsert a row by a unique key (e.g., Code)
 * - If Code exists in header column, update that row
 * - Else append as new row
 */
async function upsertRowByKey({
  spreadsheetId,
  sheetName,
  headers,
  keyColumnName, // e.g. "Code"
  keyValue,      // e.g. order.code
  rowValues,     // array aligned to headers length
}) {
  const sheets = await getSheets();

  // 1) Make sure headers are present
  await ensureHeaderRow({ spreadsheetId, sheetName, headers });

  // 2) Read all rows to find key
  const values = await getAllRows({ spreadsheetId, sheetName }); // includes header row at index 0
  if (!values.length) {
    // header ensured, but empty sheet—just append
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers, rowValues] },
    });
    return { action: "appended", rowIndex: 2 };
  }

  const headerRow = values[0];
  const keyColIndex = headerRow.indexOf(keyColumnName);
  if (keyColIndex === -1) {
    throw new Error(`Key column "${keyColumnName}" not found in sheet headers`);
  }

  let foundRowIndex = -1; // 1-based Excel row number
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    if (String(row[keyColIndex] || "").trim() === String(keyValue).trim()) {
      foundRowIndex = i + 1; // because values[0] is header -> row #1
      break;
    }
  }

  if (foundRowIndex === -1) {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
    return { action: "appended", rowIndex: values.length + 1 };
  }

  // Update existing row
  const endCol = colToA1(headers.length);
  const range = `${sheetName}!A${foundRowIndex}:${endCol}${foundRowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [rowValues] },
  });

  return { action: "updated", rowIndex: foundRowIndex };
}

module.exports = {
  getSheets,
  ensureHeaderRow,
  upsertRowByKey,
};
