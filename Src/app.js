const express = require("express");
const path = require("path");
const cors = require("cors");
const { connectDB } = require("./config/dbconfig");

require("dotenv").config({ path: path.join(__dirname, "../env") });

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://elogisol-d7em.vercel.app",
      "http://10.0.2.2:4000",
      "https://transplus.vercel.app",
      "https://elogisolvin.vercel.app",
      "https://transplus.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

// Routes
const authRoutes = require("./routes/authRoutes");
const UserRoutes = require("./routes/UserRoutes");
const transportRequestRoutes = require("./routes/transportRequestRoutes");
const transporterRoutes = require("./routes/transporterdetailsroutes");
const CustomerMasterRoutes = require("./routes/customermasterroutes");
const transactionRoutes = require("./routes/transactionRoutes");
const transportlistroutes = require("./routes/transporterlistroutes");
const serviceroutes = require("./routes/serviceroutes");
const vendorRoutes = require("./routes/vendorRoutes"); // Add this line
const driverRoutes = require("./routes/driverRoutes");
const locationRoutes = require("./routes/locationroutes"); // Import location routes
const equipmentRoutes = require("./routes/equipmentRoutes"); // Import equipment routes
const vehiicleRoutes = require("./routes/vehicleRoutes"); // Import vehicle routes
const asnRoutes = require("./routes/asnRoutes"); // Import ASN routes
const paymentReceiptRoutes = require("./routes/paymentReceiptRoutes"); // Import payment receipt routes
// Mount routes with more specific routes first
app.use("/api/auth", authRoutes);
app.use("/api/users", UserRoutes);
app.use("/api/transport-requests", transportRequestRoutes);
app.use("/api", transporterRoutes);
app.use("/api/customers", CustomerMasterRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/transporterlist", transportlistroutes);
app.use("/api/services", serviceroutes);
app.use("/api", vendorRoutes); // Add this line
app.use("/api", driverRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api", equipmentRoutes);
app.use("/api", vehiicleRoutes);
app.use("/api", asnRoutes);
app.use("/api/payment-receipts", paymentReceiptRoutes); // Payment receipts routes

// Add route not found handler
app.use((req, res, next) => {
  const error = new Error("Route not found");
  error.status = 404;
  next(error);
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);

  process.exit(1);
});

module.exports = app;
