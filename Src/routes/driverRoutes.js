const express = require("express");
const router = express.Router();
const DriverController = require("../controller/driverController");
const auth = require("../middlewares/auth");

// Get all drivers
router.get("/drivers", auth, DriverController.getAllDrivers);
// In your driver routes file
router.get('/vendor/:vendorId', DriverController.getDriversByVendorId);

// Get driver by ID
router.get("/drivers/:id", auth, DriverController.getDriverById);

// Create new driver
router.post("/drivers", auth, DriverController.createDriver);

// Update driver
router.put("/drivers/:id", auth, DriverController.updateDriver);

// Delete driver
router.delete("/drivers/:id", auth, DriverController.deleteDriver);

module.exports = router;