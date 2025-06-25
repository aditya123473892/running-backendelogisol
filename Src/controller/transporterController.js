const transporterModel = require("../models/transporterModel");

class TransporterController {
  // Create transporter details
  static async createTransporterDetails(req, res) {
    try {
      const {
        transport_request_id,
        transporter_name,
        vehicle_number,
        driver_name,
        driver_contact,
        license_number,
        license_expiry,
        // base_charge, - Remove this line
        additional_charges,
        service_charges,
        total_charge,
        container_no,
        line,
        seal_no,
        number_of_containers,
        vehicle_sequence, // Add this field to track vehicle sequence
      } = req.body;

      // Validate required fields
      if (
        !transport_request_id ||
        !transporter_name ||
        !vehicle_number ||
        !driver_name ||
        !driver_contact ||
        !license_number ||
        !license_expiry
        // !base_charge - Remove this line
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Check if transport request exists
      const requestCheck = await transporterModel.checkTransportRequestExists(
        transport_request_id
      );
      if (!requestCheck) {
        return res.status(404).json({
          success: false,
          message: "Transport request not found",
        });
      }

      // Create transporter details using model
      const result = await transporterModel.createTransporter(
        transport_request_id,
        {
          transporter_name,
          vehicle_number,
          driver_name,
          driver_contact,
          license_number,
          license_expiry,
         
          additional_charges,
          service_charges,
          total_charge,
          container_no,
          line,
          seal_no,
          number_of_containers,
          vehicle_sequence, // Pass vehicle sequence to model
        }
      );

      return res.status(201).json({
        success: true,
        message: "Transporter details saved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Create transporter details error:", error);
      return res.status(500).json({
        success: false,
        message: "Error saving transporter details",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update transporter details
  static async updateTransporterDetails(req, res) {
    try {
      const { id } = req.params;
      const {
        transporter_name,
        vehicle_number,
        driver_name,
        driver_contact,
        license_number,
        license_expiry,
    
        additional_charges,
        service_charges, // Add this to accept service charges
        total_charge,
        container_no,
        line,
        seal_no,
        number_of_containers,
        seal1,                 // Add this
        seal2,                 // Add this
        container_total_weight, // Add this
        cargo_total_weight,    // Add this
        container_type,        // Add this
        container_size         // Add this
      } = req.body;

      // Update transporter details using model
      const result = await transporterModel.updateTransporter(id, {
        transporter_name,
        vehicle_number,
        driver_name,
        driver_contact,
        license_number,
        license_expiry,
    
        additional_charges,
        service_charges, // Pass service charges to model
        total_charge,
        container_no,
        line,
        seal_no,
        number_of_containers,
        seal1,                 // Add this
        seal2,                 // Add this
        container_total_weight, // Add this
        cargo_total_weight,    // Add this
        container_type,        // Add this
        container_size         // Add this
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Transporter details not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Transporter details updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Update transporter details error:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating transporter details",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get transporter details by transport request ID
  static async getTransporterDetailsByRequestId(req, res) {
    try {
      const requestId = parseInt(req.params.requestId);
      const transporterDetails =
        await transporterModel.getTransporterByRequestId(requestId);

      if (!transporterDetails || transporterDetails.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Transporter details not found for this request",
        });
      }

      res.json({
        success: true,
        data: transporterDetails, // This will return an array
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching transporter details",
        error: error.message,
      });
    }
  }

  // Get all transporter details (admin only)
  static async getAllTransporterDetails(req, res) {
    try {
      const transporterDetailsList =
        await transporterModel.getAllTransporters();

      // Format dates for frontend
      const formattedList = transporterDetailsList.map((record) => ({
        ...record,
        license_expiry: record.license_expiry
          ? new Date(record.license_expiry).toISOString().split("T")[0]
          : null,
      }));

      return res.status(200).json({
        success: true,
        data: formattedList,
      });
    } catch (error) {
      console.error("Get all transporter details error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transporter details",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete transporter details
  static async deleteTransporterDetails(req, res) {
    try {
      const { id } = req.params;
      const result = await transporterModel.deleteTransporter(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Transporter details not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Transporter details deleted successfully",
      });
    } catch (error) {
      console.error("Delete transporter details error:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting transporter details",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update container details
  // Update container details
  static async updateContainerDetails(req, res) {
    try {
      const { id } = req.params;
      const { 
        container_no, 
        line, 
        seal_no, 
        number_of_containers,
        seal1,                 // Add this
        seal2,                 // Add this
        container_total_weight, // Add this
        cargo_total_weight,    // Add this
        container_type,        // Add this
        container_size,        // Add this
        vehicle_number         // Add this
      } = req.body;
  
      // Update container details using model
      const result = await transporterModel.updateContainerDetails(id, {
        container_no,
        line,
        seal_no,
        number_of_containers,
        seal1,                 // Add this
        seal2,                 // Add this
        container_total_weight, // Add this
        cargo_total_weight,    // Add this
        container_type,        // Add this
        container_size,        // Add this
        vehicle_number         // Add this
      });
  
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Transporter details not found",
        });
      }
  
      return res.status(200).json({
        success: true,
        message: "Container details updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Update container details error:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating container details",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get containers by vehicle number for a specific request
  static async getContainersByVehicleNumber(req, res) {
    try {
      const requestId = parseInt(req.params.requestId);
      const vehicleNumber = req.params.vehicleNumber;

      // Validate inputs
      if (!requestId || !vehicleNumber) {
        return res.status(400).json({
          success: false,
          message: "Request ID and vehicle number are required",
        });
      }

      const containers = await transporterModel.getContainersByVehicleNumber(
        requestId,
        vehicleNumber
      );

      if (!containers || containers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No containers found for this vehicle and request",
        });
      }

      return res.status(200).json({
        success: true,
        data: containers,
      });
    } catch (error) {
      console.error("Get containers by vehicle number error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching containers",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Add multiple containers to a vehicle
  static async addContainersToVehicle(req, res) {
    try {
      const requestId = parseInt(req.params.requestId);
      const vehicleNumber = req.params.vehicleNumber;
      const { containers } = req.body;

      // Validate inputs
      if (!requestId || !vehicleNumber) {
        return res.status(400).json({
          success: false,
          message: "Request ID and vehicle number are required",
        });
      }

      if (!containers || !Array.isArray(containers) || containers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Containers array is required",
        });
      }

      // Check if transport request exists
      const requestCheck = await transporterModel.checkTransportRequestExists(
        requestId
      );
      if (!requestCheck) {
        return res.status(404).json({
          success: false,
          message: "Transport request not found",
        });
      }

      const results = await transporterModel.addContainersToVehicle(
        requestId,
        vehicleNumber,
        containers
      );

      return res.status(201).json({
        success: true,
        message: `${results.length} containers added successfully to vehicle ${vehicleNumber}`,
        data: results,
      });
    } catch (error) {
      console.error("Add containers to vehicle error:", error);
      return res.status(500).json({
        success: false,
        message: "Error adding containers to vehicle",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = TransporterController;
