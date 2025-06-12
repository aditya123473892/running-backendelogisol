const { pool, sql } = require("../config/dbconfig");

const transporterModel = {
  // Get transporter details by request ID
  getTransporterByRequestId: async (requestId) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId).query(`
          SELECT * FROM transporter_details 
          WHERE request_id = @request_id
        `);
      return result.recordset;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  },

  // Create new transporter details
  createTransporter: async (transportRequestId, transporterData) => {
    try {
    // In the createTransporter function
const {
  transporter_name,
  vehicle_number,
  driver_name,
  driver_contact,
  license_number,
  license_expiry,
  base_charge,           // Add this
  additional_charges,    // Add this
  service_charges,
  total_charge,
  container_no,
  line,
  seal_no,
  number_of_containers,
  
} = transporterData;

const result = await pool
  .request()
  .input("request_id", sql.Int, transportRequestId)
  .input("transporter_name", sql.NVarChar(255), transporter_name)
  .input("vehicle_number", sql.NVarChar(50), vehicle_number)
  .input("driver_name", sql.NVarChar(255), driver_name)
  .input("driver_contact", sql.NVarChar(20), driver_contact)
  .input("license_number", sql.NVarChar(50), license_number)
  .input("license_expiry", sql.Date, new Date(license_expiry))
  .input("base_charge", sql.Decimal(12, 2), base_charge)           // Add this
  .input("additional_charges", sql.Decimal(12, 2), additional_charges || 0)  // Add this
  .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
  .input("total_charge", sql.Decimal(12, 2), total_charge)
  .input("container_no", sql.NVarChar(100), container_no || null)
  .input("line", sql.NVarChar(100), line || null)
  .input("seal_no", sql.NVarChar(100), seal_no || null)
  .input("number_of_containers", sql.Int, number_of_containers || null)
  .query(`
    INSERT INTO transporter_details (
      request_id, transporter_name, vehicle_number,
      driver_name, driver_contact, license_number, 
      license_expiry, base_charge, additional_charges, service_charges, total_charge,
      container_no, line, seal_no, number_of_containers
    )
    OUTPUT INSERTED.*
    VALUES (
      @request_id, @transporter_name, @vehicle_number,
      @driver_name, @driver_contact, @license_number,
      @license_expiry, @base_charge, @additional_charges, @service_charges, @total_charge,
      @container_no, @line, @seal_no, @number_of_containers
    )
  `);

      return result.recordset[0];
    } catch (error) {
      console.error("Create transporter error:", error);
      throw error;
    }
  },

  // Update existing transporter details
  updateTransporter: async (id, transporterData) => {
    try {
      const {
        transporter_name,
        vehicle_number,
        driver_name,
        driver_contact,
        license_number,
        license_expiry,
        base_charge,           // Add this
        additional_charges,    // Add this
        service_charges, 
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
      } = transporterData;

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("transporter_name", sql.NVarChar(255), transporter_name)
        .input("vehicle_number", sql.NVarChar(50), vehicle_number)
        .input("driver_name", sql.NVarChar(255), driver_name)
        .input("driver_contact", sql.NVarChar(20), driver_contact)
        .input("license_number", sql.NVarChar(50), license_number)
        .input("license_expiry", sql.Date, new Date(license_expiry))
        .input("base_charge", sql.Decimal(12, 2), base_charge)           // Add this
        .input("additional_charges", sql.Decimal(12, 2), additional_charges || 0)  // Add this
        .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
        .input("total_charge", sql.Decimal(12, 2), total_charge)
        .input("container_no", sql.NVarChar(100), container_no || null)
        .input("line", sql.NVarChar(100), line || null)
        .input("seal_no", sql.NVarChar(100), seal_no || null)
        .input("number_of_containers", sql.Int, number_of_containers || null)
        .input("seal1", sql.NVarChar(100), seal1 || null)                 // Add this
        .input("seal2", sql.NVarChar(100), seal2 || null)                 // Add this
        .input("container_total_weight", sql.Decimal(12, 2), container_total_weight || null) // Add this
        .input("cargo_total_weight", sql.Decimal(12, 2), cargo_total_weight || null)       // Add this
        .input("container_type", sql.NVarChar(50), container_type || null)               // Add this
        .input("container_size", sql.NVarChar(20), container_size || null)               // Add this
        .query(`
          UPDATE transporter_details 
          SET 
            transporter_name = @transporter_name,
            vehicle_number = @vehicle_number,
            driver_name = @driver_name,
            driver_contact = @driver_contact,
            license_number = @license_number,
            license_expiry = @license_expiry,
            base_charge = @base_charge,                       /* Add this */
            additional_charges = @additional_charges,         /* Add this */
            service_charges = @service_charges,
            total_charge = @total_charge,
            container_no = @container_no,
            line = @line,
            seal_no = @seal_no,
            number_of_containers = @number_of_containers,
            seal1 = @seal1,                                   /* Add this */
            seal2 = @seal2,                                   /* Add this */
            container_total_weight = @container_total_weight, /* Add this */
            cargo_total_weight = @cargo_total_weight,         /* Add this */
            container_type = @container_type,                 /* Add this */
            container_size = @container_size,                 /* Add this */
            updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Update transporter error:", error);
      throw error;
    }
  },

  // Update container details only
  updateContainerDetails: async (id, containerData) => {
    try {
      const { container_no, line, seal_no, number_of_containers } =
        containerData;

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("container_no", sql.NVarChar(100), container_no || null)
        .input("line", sql.NVarChar(100), line || null)
        .input("seal_no", sql.NVarChar(100), seal_no || null)
        .input("number_of_containers", sql.Int, number_of_containers || null)
        .query(`
          UPDATE transporter_details 
          SET 
            container_no = @container_no,
            line = @line,
            seal_no = @seal_no,
            number_of_containers = @number_of_containers,
            updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Update container details error:", error);
      throw error;
    }
  },

  // Delete transporter details
  deleteTransporter: async (id) => {
    try {
      const result = await pool.request().input("id", sql.Int, id).query(`
          DELETE FROM transporter_details 
          OUTPUT DELETED.*
          WHERE id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Delete transporter error:", error);
      throw error;
    }
  },

  // Get all transporter details (admin)
  getAllTransporters: async () => {
    try {
      const result = await pool.request().query(`
        SELECT 
          td.*,
          tr.status as request_status,
          tr.consignee,
          tr.consigner,
          u.name as customer_name,
          u.email as customer_email
        FROM transporter_details td
        INNER JOIN transport_requests tr ON td.request_id = tr.id
        INNER JOIN users u ON tr.customer_id = u.id
        ORDER BY td.created_at DESC
      `);

      return result.recordset;
    } catch (error) {
      console.error("Get all transporters error:", error);
      throw error;
    }
  },

  // Check if transport request exists
  checkTransportRequestExists: async (requestId) => {
    try {
      const result = await pool.request().input("requestId", sql.Int, requestId)
        .query(`
          SELECT id, status FROM transport_requests 
          WHERE id = @requestId
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Check transport request error:", error);
      throw error;
    }
  },

  // Check if transporter details exist for a request
  checkTransporterExists: async (requestId) => {
    try {
      const result = await pool.request().input("requestId", sql.Int, requestId)
        .query(`
          SELECT id FROM transporter_details 
          WHERE request_id = @requestId
        `);

      return result.recordset;
    } catch (error) {
      console.error("Check transporter exists error:", error);
      throw error;
    }
  },
};

module.exports = transporterModel;
