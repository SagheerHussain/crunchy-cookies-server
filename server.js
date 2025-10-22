const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const cors = require("cors");
const axios = require("axios");
const http = require("http");

const { dbConnection } = require("./config/config.js");

const authRoutes = require("./routes/auth.route.js");
const addressRoutes = require("./routes/address.route.js");
const brandRoutes = require("./routes/brand.route.js");
const cartRoutes = require("./routes/cart.route.js");
const colorRoutes = require("./routes/color.route.js");
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

const { ensureHeaders, appendRow } = require("./utils/googleSheets.js");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 5000;

/* CORS */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://crunchy-cookies.skynetsilicon.com",
  "https://crunchy-cookies-dashboard.vercel.app",
];
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("Not allowed by CORS")),
    credentials: true,
  })
);

/* Body parsers BEFORE routes */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* DB */
dbConnection();

/* Routes */
app.get("/", (_req, res) =>
  res.status(200).json({ message: "Welcome Back Crunchy Cookies Server" })
);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/address", addressRoutes);
app.use("/api/v1/brand", brandRoutes);
app.use("/api/v1/cart", cartRoutes);
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

app.use("/api", require("./routes/ping_routes"));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at:`);
    console.log(`→ http://localhost:${PORT}`);
    // Auto ping to keep Render awake
    const axios = require('axios');
    setInterval(async () => {
        try {
            await axios.get('https://crunchy-cookies-server.onrender.com/api/ping');
            console.log(`[AutoPing] Successful at ${new Date().toISOString()}`);
        } catch (err) {
            console.error('[AutoPing] Failed:', err.message);
        }
    }, 10 * 60 * 1000); // 10 minutes
});