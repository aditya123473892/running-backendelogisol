const TransportRequest = require("../models/TransportRequestModel");
const { pool, sql } = require("../config/dbconfig");

exports.createRequest = async (req, res) => {
  try {
    const {
      consignee,
      consigner,
      vehicle_type,
      vehicle_size,
      pickup_location,
      stuffing_location,
      delivery_location,
      commodity,
      cargo_type,
      cargo_weight,
      service_type,
      service_prices,
      containers_20ft,
      containers_40ft,
      total_containers,
      expected_pickup_date,
      expected_delivery_date,
      requested_price,
      no_of_vehicles,
      status,
    } = req.body;

    // Parse service_type if it's a string
    let parsedServiceType = service_type;
    try {
      if (typeof service_type === "string") {
        parsedServiceType = JSON.parse(service_type);
      }
    } catch (error) {
      console.error("Error parsing service_type:", error);
      parsedServiceType = ["Transport"];
    }

    // Parse service_prices if it's a string
    let parsedServicePrices = service_prices || {};
    try {
      if (typeof service_prices === "string") {
        parsedServicePrices = JSON.parse(service_prices);
      }
    } catch (error) {
      console.error("Error parsing service_prices:", error);
      parsedServicePrices = {};
    }

    const result = await pool
      .request()
      .input("customer_id", sql.Int, req.user.id)
      .input("vehicle_type", sql.NVarChar, vehicle_type)
      .input("vehicle_size", sql.NVarChar, vehicle_size)
      .input("consignee", sql.NVarChar, consignee)
      .input("consigner", sql.NVarChar, consigner)
      .input("containers_20ft", sql.Int, containers_20ft || 0)
      .input("containers_40ft", sql.Int, containers_40ft || 0)
      .input("total_containers", sql.Int, total_containers || 0)
      .input("pickup_location", sql.NVarChar, pickup_location)
      .input("stuffing_location", sql.NVarChar, stuffing_location)
      .input("delivery_location", sql.NVarChar, delivery_location)
      .input("commodity", sql.NVarChar, commodity)
      .input("cargo_type", sql.NVarChar, cargo_type)
      .input("cargo_weight", sql.Decimal(10, 2), cargo_weight)
      .input(
        "service_type",
        sql.NVarChar(sql.MAX),
        JSON.stringify(parsedServiceType)
      )
      .input(
        "service_prices",
        sql.NVarChar(sql.MAX),
        JSON.stringify(parsedServicePrices)
      )
      .input("expected_pickup_date", sql.Date, new Date(expected_pickup_date))
      .input(
        "expected_delivery_date",
        sql.Date,
        new Date(expected_delivery_date)
      )
      .input("requested_price", sql.Decimal(10, 2), requested_price)
      .input("no_of_vehicles", sql.Int, no_of_vehicles || 1)
      .input("status", sql.NVarChar, status || "Pending").query(`
        INSERT INTO transport_requests (
          customer_id, vehicle_type, vehicle_size, consignee, consigner,
          containers_20ft, containers_40ft, total_containers,
          pickup_location, stuffing_location, delivery_location,
          commodity, cargo_type, cargo_weight, service_type,
          service_prices, expected_pickup_date, expected_delivery_date,
          requested_price, status, no_of_vehicles, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @customer_id, @vehicle_type, @vehicle_size, @consignee, @consigner,
          @containers_20ft, @containers_40ft, @total_containers,
          @pickup_location, @stuffing_location, @delivery_location,
          @commodity, @cargo_type, @cargo_weight, @service_type,
          @service_prices, @expected_pickup_date, @expected_delivery_date,
          @requested_price, @status, @no_of_vehicles, GETDATE()
        )
      `);

    return res.status(201).json({
      success: true,
      message: "Transport request created successfully",
      request: result.recordset[0],
    });
  } catch (error) {
    console.error("Create request error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating transport request",
      error: error.message,
    });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const {
      consignee,
      consigner,
      vehicle_type,
      vehicle_size,
      pickup_location,
      stuffing_location,
      delivery_location,
      commodity,
      cargo_type,
      cargo_weight,
      service_type,
      service_prices,
      containers_20ft,
      containers_40ft,
      total_containers,
      expected_pickup_date,
      expected_delivery_date,
      requested_price,
      no_of_vehicles,
      status,
    } = req.body;

    // Parse service_type and service_prices if they're strings
    let parsedServiceType = service_type;
    let parsedServicePrices = service_prices;

    try {
      if (typeof service_type === "string") {
        parsedServiceType = JSON.parse(service_type);
      }
    } catch (error) {
      console.error("Error parsing service_type:", error);
    }

    try {
      if (typeof service_prices === "string") {
        parsedServicePrices = JSON.parse(service_prices);
      }
    } catch (error) {
      console.error("Error parsing service_prices:", error);
    }

    const result = await pool
      .request()
      .input("id", sql.Int, requestId)
      .input("consignee", sql.NVarChar, consignee)
      .input("consigner", sql.NVarChar, consigner)
      .input("vehicle_type", sql.NVarChar, vehicle_type)
      .input("vehicle_size", sql.NVarChar, vehicle_size)
      .input("pickup_location", sql.NVarChar, pickup_location)
      .input("stuffing_location", sql.NVarChar, stuffing_location)
      .input("delivery_location", sql.NVarChar, delivery_location)
      .input("commodity", sql.NVarChar, commodity)
      .input("cargo_type", sql.NVarChar, cargo_type)
      .input("cargo_weight", sql.Decimal(10, 2), cargo_weight)
      .input(
        "service_type",
        sql.NVarChar(sql.MAX),
        JSON.stringify(parsedServiceType)
      )
      .input(
        "service_prices",
        sql.NVarChar(sql.MAX),
        JSON.stringify(parsedServicePrices)
      )
      .input("containers_20ft", sql.Int, containers_20ft)
      .input("containers_40ft", sql.Int, containers_40ft)
      .input("total_containers", sql.Int, total_containers)
      .input("expected_pickup_date", sql.Date, expected_pickup_date)
      .input("expected_delivery_date", sql.Date, expected_delivery_date)
      .input("requested_price", sql.Decimal(10, 2), requested_price)
      .input("no_of_vehicles", sql.Int, no_of_vehicles || 1)
      .input("status", sql.NVarChar, status).query(`
        UPDATE transport_requests 
        SET consignee = @consignee,
            consigner = @consigner,
            vehicle_type = @vehicle_type,
            vehicle_size = @vehicle_size,
            pickup_location = @pickup_location,
            stuffing_location = @stuffing_location,
            delivery_location = @delivery_location,
            commodity = @commodity,
            cargo_type = @cargo_type,
            cargo_weight = @cargo_weight,
            service_type = @service_type,
            service_prices = @service_prices,
            containers_20ft = @containers_20ft,
            containers_40ft = @containers_40ft,
            total_containers = @total_containers,
            expected_pickup_date = @expected_pickup_date,
            expected_delivery_date = @expected_delivery_date,
            requested_price = @requested_price,
            status = @status,
            no_of_vehicles = @no_of_vehicles,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: "Transport request updated successfully",
    });
  } catch (error) {
    console.error("Update error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update transport request" });
  }
};

exports.getCustomerRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.getCustomerRequests(req.user.id);
    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get customer requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transport requests",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const requests = await TransportRequest.getAllRequests();
    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get all requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transport requests",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminComment } = req.body;

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'approved' or 'rejected'",
      });
    }

    // Validate admin comment
    if (!adminComment || adminComment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Admin comment is required",
      });
    }

    const updatedRequest = await TransportRequest.updateStatus(
      requestId,
      status,
      adminComment
    );

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: "Transport request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update request status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
