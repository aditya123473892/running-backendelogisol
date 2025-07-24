const express = require("express");
const router = express.Router();
const VendorController = require("../controller/vendorController");
const auth = require("../middlewares/auth");

// Get all vendors
router.get("/vendors", auth, VendorController.getAllVendors);

// Get vendor by ID
router.get("/vendors/:id", auth, VendorController.getVendorById);

// Create new vendor
router.post("/vendors", auth, VendorController.createVendor);

// Update vendor
router.put("/vendors/:id", auth, VendorController.updateVendor);

// Delete vendor
router.delete("/vendors/:id", auth, VendorController.deleteVendor);

module.exports = router;