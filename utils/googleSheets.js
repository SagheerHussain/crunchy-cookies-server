// utils/googleSheets.js
const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");
const fs = require("fs");
const path = require("path");

let _sheets;

/** A1 helpers */
const colToA1 = (n) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function buildCredentialsFromEnv() {
  if (process.env.GCP_SA_KEY_JSON) {
    try {
      return JSON.parse(process.env.GCP_SA_KEY_JSON);
    } catch (e) {
      throw new Error("GCP_SA_KEY_JSON is not valid JSON");
    }
  }
  if (process.env.GCP_SA_KEY_B64) {
    try {
      const json = Buffer.from(process.env.GCP_SA_KEY_B64, "base64").toString("utf8");
      return JSON.parse(json);
    } catch {
      throw new Error("GCP_SA_KEY_B64 is not valid base64/JSON");
    }
  }
  return null;
}

async function getSheets() {
  if (_sheets) return _sheets;

  const creds = buildCredentialsFromEnv();
  let auth;

  if (creds) {
    auth = new GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  } else {
    // Local fallback: use a key file if present
    const keyFile =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.resolve(process.cwd(), "credentials.json");
    if (!fs.existsSync(keyFile)) {
      throw new Error(
        "No Google credentials found. Set GCP_SA_KEY_JSON (or GCP_SA_KEY_B64) or provide credentials.json"
      );
    }
    auth = new GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  const client = await auth.getClient();
  _sheets = google.sheets({ version: "v4", auth: client });
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
 */
async function upsertRowByKey({
  spreadsheetId,
  sheetName,
  headers,
  keyColumnName,
  keyValue,
  rowValues,
}) {
  const sheets = await getSheets();

  // 1) Ensure headers
  await ensureHeaderRow({ spreadsheetId, sheetName, headers });

  // 2) Search for existing key
  const values = await getAllRows({ spreadsheetId, sheetName }); // includes header row (index 0)
  if (!values.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [headers, rowValues] },
    });
    return { action: "appended", rowIndex: 2 };
  }

  const headerRow = values[0];
  const keyColIndex = headerRow.indexOf(keyColumnName);
  if (keyColIndex === -1) {
    throw new Error(`Key column "${keyColumnName}" not found in sheet headers`);
  }

  let foundRowIndex = -1; // 1-based
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    if (String(row[keyColIndex] || "").trim() === String(keyValue).trim()) {
      foundRowIndex = i + 1;
      break;
    }
  }

  if (foundRowIndex === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
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
