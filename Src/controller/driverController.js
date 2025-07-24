const DriverModel = require("../models/DriverModel");

class DriverController {
  // Get all drivers
  static async getAllDrivers(req, res) {
    try {
      const drivers = await DriverModel.getAll();
      res.json({ success: true, data: drivers });
    } catch (error) {
      console.error("Get all drivers controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch drivers." });
    }
  }

  // Get drivers by vendor ID
  static async getDriversByVendorId(req, res) {
    try {
      const { vendorId } = req.params;
      const drivers = await DriverModel.getByVendorId(vendorId);
      res.json({ success: true, data: drivers });
    } catch (error) {
      console.error("Get drivers by vendor ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch drivers for this vendor." });
    }
  }

  // Get driver by ID
  static async getDriverById(req, res) {
    try {
      const { id } = req.params;
      const driver = await DriverModel.getById(id);
      if (!driver) {
        return res.status(404).json({ success: false, message: "Driver not found." });
      }
      res.json({ success: true, data: driver });
    } catch (error) {
      console.error("Get driver by ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch driver details." });
    }
  }

  // Create new driver
  static async createDriver(req, res) {
    try {
      const data = req.body;
      const result = await DriverModel.create(data);
      res.status(201).json({ success: true, message: "Driver created successfully.", data: result });
    } catch (error) {
      console.error("Create driver controller error:", error);
      res.status(500).json({ success: false, error: "Failed to create driver." });
    }
  }

  // Update driver
  static async updateDriver(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      await DriverModel.update(id, data);
      res.json({ success: true, message: "Driver updated successfully." });
    } catch (error) {
      console.error("Update driver controller error:", error);
      res.status(500).json({ success: false, error: "Failed to update driver." });
    }
  }

  // Delete driver
  static async deleteDriver(req, res) {
    try {
      const { id } = req.params;
      await DriverModel.delete(id);
      res.json({ success: true, message: "Driver deleted successfully." });
    } catch (error) {
      console.error("Delete driver controller error:", error);
      res.status(500).json({ success: false, error: "Failed to delete driver." });
    }
  }
}

module.exports = DriverController;