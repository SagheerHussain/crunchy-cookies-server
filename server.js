const express = require("express");
const app = express();
require("dotenv").config();
const { dbConnection } = require("./config/config");

const PORT = process.env.PORT || 3000;

// Database connection
dbConnection();

// Import Routes
const authRoutes = require("./routes/auth.route");
const addressRoutes = require("./routes/address.route");
const brandRoutes = require("./routes/brand.route");
const cartRoutes = require("./routes/cart.route");
const cartItemRoutes = require("./routes/cartItems.route");
const categoryRoutes = require("./routes/category.route");
const categoryTypeRoutes = require("./routes/categoryType.route");
const colorRoutes = require("./routes/color.route");
const couponRoutes = require("./routes/coupon.route");
const invoiceRoutes = require("./routes/invoice.route");
const occasionRoutes = require("./routes/occasion.route");
const ongoingOrderRoutes = require("./routes/ongoingOrder.route");
const orderRoutes = require("./routes/order.route");
const orderCancelRoutes = require("./routes/orderCancel.route");
const orderHistoryRoutes = require("./routes/orderHistory.route");
const orderItemRoutes = require("./routes/orderItems.route");
const packagingRoutes = require("./routes/packaging.route");
const paymentMethodRoutes = require("./routes/paymentMethod.route");
const permissionRoutes = require("./routes/permission.route");
const productRoutes = require("./routes/product.route");
const recipientRoutes = require("./routes/recipient.route");
const roleRoutes = require("./routes/role.route");
const subCategoryRoutes = require("./routes/subCategory.route");
const userRoutes = require("./routes/user.route");
const wishlistRoutes = require("./routes/wishlist.route");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome Back Crunchy Cookies Server" });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/address", addressRoutes);
app.use("/api/v1/brand", brandRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/cartItem", cartItemRoutes);
app.use("/api/v1/category", categoryRoutes);    
app.use("/api/v1/categoryType", categoryTypeRoutes);
app.use("/api/v1/color", colorRoutes);
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

// Server listen
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});