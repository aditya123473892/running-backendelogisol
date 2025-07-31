const VendorModel = require("../models/VendorModel");

class VendorController {
  // Get all vendors
  static async getAllVendors(req, res) {
    try {
      const vendors = await VendorModel.getAll();
      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error("Get all vendors controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch vendors.",
        details: error.message 
      });
    }
  }

  // Get vendor by ID
  static async getVendorById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid vendor ID provided." 
        });
      }

      const vendor = await VendorModel.getById(id);
      if (!vendor) {
        return res.status(404).json({ 
          success: false, 
          message: "Vendor not found." 
        });
      }
      
      res.json({ success: true, data: vendor });
    } catch (error) {
      console.error("Get vendor by ID controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch vendor details.",
        details: error.message 
      });
    }
  }

  // Create new vendor
  static async createVendor(req, res) {
    try {
      const data = req.body;
      
      // Validate required fields
      if (!data.vendor_name || data.vendor_name.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: "Vendor name is required." 
        });
      }

      // Log the incoming data for debugging
      console.log("Creating vendor with data:", data);

      const result = await VendorModel.create(data);
      
      res.status(201).json({ 
        success: true, 
        message: "Vendor created successfully.", 
        data: result 
      });
    } catch (error) {
      console.error("Create vendor controller error:", error);
      
      // Handle specific SQL Server errors
      if (error.number === 2627) { // Duplicate key error
        return res.status(400).json({ 
          success: false, 
          error: "Vendor with this ID already exists." 
        });
      }
      
      if (error.number === 515) { // Cannot insert null error
        return res.status(400).json({ 
          success: false, 
          error: "Required field is missing or null." 
        });
      }

      res.status(500).json({ 
        success: false, 
        error: "Failed to create vendor.",
        details: error.message 
      });
    }
  }

  // Update vendor
  static async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid vendor ID provided." 
        });
      }

      // Validate required fields
      if (!data.vendor_name || data.vendor_name.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: "Vendor name is required." 
        });
      }

      // Check if vendor exists
      const existingVendor = await VendorModel.getById(id);
      if (!existingVendor) {
        return res.status(404).json({ 
          success: false, 
          message: "Vendor not found." 
        });
      }

      // Log the update data for debugging
      console.log("Updating vendor ID:", id, "with data:", data);

      await VendorModel.update(id, data);
      
      res.json({ 
        success: true, 
        message: "Vendor updated successfully." 
      });
    } catch (error) {
      console.error("Update vendor controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to update vendor.",
        details: error.message 
      });
    }
  }

  // Delete vendor
  static async deleteVendor(req, res) {
    try {
      const { id } = req.params;
      
      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid vendor ID provided." 
        });
      }

      // Check if vendor exists
      const existingVendor = await VendorModel.getById(id);
      if (!existingVendor) {
        return res.status(404).json({ 
          success: false, 
          message: "Vendor not found." 
        });
      }

      await VendorModel.delete(id);
      
      res.json({ 
        success: true, 
        message: "Vendor deleted successfully." 
      });
    } catch (error) {
      console.error("Delete vendor controller error:", error);
      
      // Handle foreign key constraint errors
      if (error.number === 547) {
        return res.status(400).json({ 
          success: false, 
          error: "Cannot delete vendor. It may be referenced by other records." 
        });
      }

      res.status(500).json({ 
        success: false, 
        error: "Failed to delete vendor.",
        details: error.message 
      });
    }
  }
}

module.exports = VendorController;