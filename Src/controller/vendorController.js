const VendorModel = require("../models/VendorModel");

class VendorController {
  // Get all vendors
  static async getAllVendors(req, res) {
    try {
      const vendors = await VendorModel.getAll();
      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error("Get all vendors controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch vendors." });
    }
  }

  // Get vendor by ID
  static async getVendorById(req, res) {
    try {
      const { id } = req.params;
      const vendor = await VendorModel.getById(id);
      if (!vendor) {
        return res.status(404).json({ success: false, message: "Vendor not found." });
      }
      res.json({ success: true, data: vendor });
    } catch (error) {
      console.error("Get vendor by ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch vendor details." });
    }
  }

  // Create new vendor
  static async createVendor(req, res) {
    try {
      const data = req.body;
      const result = await VendorModel.create(data);
      res.status(201).json({ success: true, message: "Vendor created successfully.", data: result });
    } catch (error) {
      console.error("Create vendor controller error:", error);
      res.status(500).json({ success: false, error: "Failed to create vendor." });
    }
  }

  // Update vendor
  static async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      await VendorModel.update(id, data);
      res.json({ success: true, message: "Vendor updated successfully." });
    } catch (error) {
      console.error("Update vendor controller error:", error);
      res.status(500).json({ success: false, error: "Failed to update vendor." });
    }
  }

  // Delete vendor
  static async deleteVendor(req, res) {
    try {
      const { id } = req.params;
      await VendorModel.delete(id);
      res.json({ success: true, message: "Vendor deleted successfully." });
    } catch (error) {
      console.error("Delete vendor controller error:", error);
      res.status(500).json({ success: false, error: "Failed to delete vendor." });
    }
  }
}

module.exports = VendorController;