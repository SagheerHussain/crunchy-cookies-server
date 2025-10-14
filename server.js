const express = require("express");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const cors = require("cors");

const { dbConnection } = require("./config/config.js");

const authRoutes = require("./routes/auth.route.js");
const addressRoutes = require("./routes/address.route.js");
const brandRoutes = require("./routes/brand.route.js");
const cartRoutes = require("./routes/cart.route.js");
const colorRoutes = require("./routes/color.route.js");
const cartItemRoutes = require("./routes/cartItems.route.js");
const categoryRoutes = require("./routes/category.route.js");
const categoryTypeRoutes = require("./routes/categoryType.route.js");
const couponRoutes = require("./routes/coupon.route.js");
const invoiceRoutes = require("./routes/invoice.route.js");
const occasionRoutes = require("./routes/occasion.route.js");
const ongoingOrderRoutes = require("./routes/ongoingOrder.route.js");
const orderRoutes = require("./routes/order.route.js");
const orderCancelRoutes = require("./routes/orderCancel.route.js");
const orderHistoryRoutes = require("./routes/orderHistory.route.js");
const orderItemRoutes = require("./routes/orderItems.route.js");
const packagingRoutes = require("./routes/packaging.route.js");
const paymentMethodRoutes = require("./routes/paymentMethod.route.js");
const permissionRoutes = require("./routes/permission.route.js");
const productRoutes = require("./routes/product.route.js");
const recipientRoutes = require("./routes/recipient.route.js");
const roleRoutes = require("./routes/role.route.js");
const subCategoryRoutes = require("./routes/subCategory.route.js");
const userRoutes = require("./routes/user.route.js");
const wishlistRoutes = require("./routes/wishlist.route.js");
const analyticsRoutes = require("./routes/analytics.route.js");

const { ensureHeaders, appendRow } = require('./utils/googleSheets.js');
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 5000;

/* CORS */
const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];
app.use(
  cors({
    origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
    credentials: true,
  })
);

/* Body parsers BEFORE routes */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* DB */
dbConnection();

/* Routes */
app.get("/", (_req, res) => res.status(200).json({ message: "Welcome Back Crunchy Cookies Server" }));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/address", addressRoutes);
app.use("/api/v1/brand", brandRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/cartItem", cartItemRoutes);
app.use("/api/v1/color", colorRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/categoryType", categoryTypeRoutes);
app.use("/api/v1/coupon", couponRoutes);
app.use("/api/v1/invoice", invoiceRoutes);
app.use("/api/v1/occasion", occasionRoutes);
app.use("/api/v1/ongoingOrder", ongoingOrderRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/orderCancel", orderCancelRoutes);
app.use("/api/v1/orderHistory", orderHistoryRoutes);
app.use("/api/v1/orderItem", orderItemRoutes);
app.use("/api/v1/packaging", packagingRoutes);
app.use("/api/v1/paymentMethod", paymentMethodRoutes);
app.use("/api/v1/permission", permissionRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/recipient", recipientRoutes);
app.use("/api/v1/role", roleRoutes);
app.use("/api/v1/subCategory", subCategoryRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

app.get('/test/sheet', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();

    const googleSheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = "1GJ5Gfe_37oO7UIzJ0yFaEiafX-BdrSd65o9emijLKzQ";

    const metaData = await googleSheets.spreadsheets.get({
      auth,
      spreadsheetId
    })

    const getRows = await googleSheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: "Orders"
    })

    await googleSheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: "Orders!A:B",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [
          ["SA-2025-000124", "2025-10-13", "", "2025-10-13", "pending", "pending", "Muhammad Shayan", "03162196345", "03162184642", "QAR 1000", "10%", "QAR 250", "QAR 0", "NEWYEAR10", "Please Deliver as soon as possible", "Happy Wishes to my lovely sister", "https://crunchy-cookies.skynetsilicon.com/images/preview-card.png"],
          ["SA-2025-000125", "2025-10-14", "", "2025-10-14", "pending", "pending", "Muhammad Shayan", "03162196345", "03162184642", "QAR 1000", "10%", "QAR 250", "QAR 0", "NEWYEAR10", "Please Deliver as soon as possible", "Happy Wishes to my lovely sister", "https://crunchy-cookies.skynetsilicon.com/images/preview-card.png"],
        ]
      }
    })

    return res.send(getRows.data)
  } catch (e) {
    console.error('TEST SHEET ERROR:', e.response?.data || e);
    res.status(500).send(e.response?.data?.error?.message || e.message);
  }
});


/* Start */
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
