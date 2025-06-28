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
          ORDER BY vehicle_sequence
        `);
      return result.recordset;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  },

  // Create new transporter details
  // Modify the createTransporter function to silently handle sequence conflicts
  createTransporter: async (transportRequestId, transporterData) => {
    try {
      // Always find the next available sequence number first
      const maxSequenceResult = await pool
        .request()
        .input("request_id", sql.Int, transportRequestId)
        .query(`
          SELECT MAX(vehicle_sequence) as max_sequence 
          FROM transporter_details
          WHERE request_id = @request_id
        `);
      
      const maxSequence = maxSequenceResult.recordset[0].max_sequence || 0;
      const nextSequence = maxSequence + 1;
      
      // If a specific vehicle_sequence was provided, check if it already exists
      if (transporterData.vehicle_sequence) {
        const existingRecord = await pool
          .request()
          .input("request_id", sql.Int, transportRequestId)
          .input("vehicle_sequence", sql.Int, transporterData.vehicle_sequence)
          .query(`
            SELECT id FROM transporter_details
            WHERE request_id = @request_id AND vehicle_sequence = @vehicle_sequence
          `);
        
        // If record exists, update it instead of creating a new one
        if (existingRecord.recordset.length > 0) {
          const id = existingRecord.recordset[0].id;
          return await transporterModel.updateTransporter(id, transporterData);
        }
      }
      
      // Extract all the fields from transporterData
      const {
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
        
        seal1,
        seal2,
        container_total_weight,
        cargo_total_weight,
        container_type,
        container_size
      } = transporterData;
      
      // For existing requests, always use nextSequence to avoid conflicts
      // For new requests, use provided sequence if available, otherwise use nextSequence
      let sequenceToUse = nextSequence;
      
      // Only use the provided sequence if we're sure it won't conflict
      if (transporterData.vehicle_sequence && maxSequence === 0) {
        sequenceToUse = transporterData.vehicle_sequence;
      }
      
      // Try to insert with the chosen sequence
      try {
        const result = await pool
          .request()
          .input("request_id", sql.Int, transportRequestId)
          .input("transporter_name", sql.NVarChar(255), transporter_name)
          .input("vehicle_number", sql.NVarChar(50), vehicle_number)
          .input("driver_name", sql.NVarChar(255), driver_name)
          .input("driver_contact", sql.NVarChar(20), driver_contact)
          .input("license_number", sql.NVarChar(50), license_number)
          .input("license_expiry", sql.Date, new Date(license_expiry))
          
          .input("additional_charges", sql.Decimal(12, 2), additional_charges || 0)
          .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
          .input("total_charge", sql.Decimal(12, 2), total_charge)
          .input("container_no", sql.NVarChar(100), container_no || null)
          .input("line", sql.NVarChar(100), line || null)
          .input("seal_no", sql.NVarChar(100), seal_no || null)
          
          .input("seal1", sql.NVarChar(100), seal1 || null)
          .input("seal2", sql.NVarChar(100), seal2 || null)
          .input("container_total_weight", sql.Decimal(12, 2), container_total_weight || null)
          .input("cargo_total_weight", sql.Decimal(12, 2), cargo_total_weight || null)
          .input("container_type", sql.NVarChar(50), container_type || null)
          .input("container_size", sql.NVarChar(20), container_size || null)
          .input("vehicle_sequence", sql.Int, sequenceToUse)
          .query(`
            INSERT INTO transporter_details (
              request_id, transporter_name, vehicle_number,
              driver_name, driver_contact, license_number, 
              license_expiry,  additional_charges, service_charges, total_charge,
              container_no, line, seal_no,  vehicle_sequence,
              seal1, seal2, container_total_weight, cargo_total_weight, container_type, container_size
            )
            OUTPUT INSERTED.*
            VALUES (
              @request_id, @transporter_name, @vehicle_number,
              @driver_name, @driver_contact, @license_number,
              @license_expiry, @additional_charges, @service_charges, @total_charge,
              @container_no, @line, @seal_no,  @vehicle_sequence,
              @seal1, @seal2, @container_total_weight, @cargo_total_weight, @container_type, @container_size
            )
          `);
        
        // Update the transport request status to 'Vehicle Assigned'
        await pool
          .request()
          .input("request_id", sql.Int, transportRequestId)
          .query(`
            UPDATE transport_requests
            SET status = 'Vehicle Assigned', updated_at = GETDATE()
            WHERE id = @request_id
          `);
        
        return result.recordset[0];
      } catch (insertError) {
        // If we get a unique constraint violation, try again with a new sequence
        if (insertError.number === 2627 && insertError.message.includes('UQ_transporter_details_request_vehicle_seq')) {
          // Remove console.log statements to prevent showing conflict messages
          // console.log(`Conflict detected for request ${transportRequestId}, sequence ${sequenceToUse}. Retrying with next sequence.`);
          
          const retryMaxSequenceResult = await pool
            .request()
            .input("request_id", sql.Int, transportRequestId)
            .query(`
              SELECT MAX(vehicle_sequence) as max_sequence 
              FROM transporter_details
              WHERE request_id = @request_id
            `);
          
          const retryMaxSequence = retryMaxSequenceResult.recordset[0].max_sequence || 0;
          const retryNextSequence = retryMaxSequence + 1;
          
          // Remove console.log statements to prevent showing conflict messages
          // console.log(`Using new sequence ${retryNextSequence} for request ${transportRequestId}`);
          
          // Try inserting with the new sequence
          const retryResult = await pool
            .request()
            .input("request_id", sql.Int, transportRequestId)
            .input("transporter_name", sql.NVarChar(255), transporter_name)
            .input("vehicle_number", sql.NVarChar(50), vehicle_number)
            .input("driver_name", sql.NVarChar(255), driver_name)
            .input("driver_contact", sql.NVarChar(20), driver_contact)
            .input("license_number", sql.NVarChar(50), license_number)
            .input("license_expiry", sql.Date, new Date(license_expiry))
            
            .input("additional_charges", sql.Decimal(12, 2), additional_charges || 0)
            .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
            .input("total_charge", sql.Decimal(12, 2), total_charge)
            .input("container_no", sql.NVarChar(100), container_no || null)
            .input("line", sql.NVarChar(100), line || null)
            .input("seal_no", sql.NVarChar(100), seal_no || null)
            
            .input("seal1", sql.NVarChar(100), seal1 || null)
            .input("seal2", sql.NVarChar(100), seal2 || null)
            .input("container_total_weight", sql.Decimal(12, 2), container_total_weight || null)
            .input("cargo_total_weight", sql.Decimal(12, 2), cargo_total_weight || null)
            .input("container_type", sql.NVarChar(50), container_type || null)
            .input("container_size", sql.NVarChar(20), container_size || null)
            .input("vehicle_sequence", sql.Int, retryNextSequence)
            .query(`
              INSERT INTO transporter_details (
                request_id, transporter_name, vehicle_number,
                driver_name, driver_contact, license_number, 
                license_expiry, additional_charges, service_charges, total_charge,
                container_no, line, seal_no,  vehicle_sequence,
                seal1, seal2, container_total_weight, cargo_total_weight, container_type, container_size
              )
              OUTPUT INSERTED.*
              VALUES (
                @request_id, @transporter_name, @vehicle_number,
                @driver_name, @driver_contact, @license_number,
                @license_expiry, @additional_charges, @service_charges, @total_charge,
                @container_no, @line, @seal_no,  @vehicle_sequence,
                @seal1, @seal2, @container_total_weight, @cargo_total_weight, @container_type, @container_size
              )
            `);
          
          // Update the transport request status to 'Vehicle Assigned'
          await pool
            .request()
            .input("request_id", sql.Int, transportRequestId)
            .query(`
              UPDATE transport_requests
              SET status = 'Vehicle Assigned', updated_at = GETDATE()
              WHERE id = @request_id
            `);
          
          return retryResult.recordset[0];
        } else {
          // If it's not a unique constraint error, rethrow
          throw insertError;
        }
      }
    } catch (error) {
      console.error("Create transporter error:", error);
      throw error;
    }
  },

    // Update existing transporter details
    updateTransporter: async (id, transporterData) => {
      try {
        // First, get the current record to preserve its vehicle_sequence if not changing
        const currentRecord = await pool
          .request()
          .input("id", sql.Int, id)
          .query(`
            SELECT request_id, vehicle_sequence FROM transporter_details 
            WHERE id = @id
          `);
        
        if (currentRecord.recordset.length === 0) {
          throw new Error("Transporter record not found");
        }
        
        const currentRequestId = currentRecord.recordset[0].request_id;
        const currentSequence = currentRecord.recordset[0].vehicle_sequence;
        
        // If vehicle_sequence is being changed, check for conflicts
        if (transporterData.vehicle_sequence && 
            transporterData.vehicle_sequence !== currentSequence) {
          
          // Check if the new sequence would conflict with any existing record
          const conflictCheck = await pool
            .request()
            .input("request_id", sql.Int, currentRequestId)
            .input("vehicle_sequence", sql.Int, transporterData.vehicle_sequence)
            .input("id", sql.Int, id) // Exclude the current record
            .query(`
              SELECT id FROM transporter_details
              WHERE request_id = @request_id 
              AND vehicle_sequence = @vehicle_sequence
              AND id != @id
            `);
          
          // If there would be a conflict, find the next available sequence
          if (conflictCheck.recordset.length > 0) {
            // Remove console.log statements to prevent showing conflict messages
            // console.log(`Conflict detected during update for request ${currentRequestId}, sequence ${transporterData.vehicle_sequence}`);
            
            const maxSequenceResult = await pool
              .request()
              .input("request_id", sql.Int, currentRequestId)
              .query(`
                SELECT MAX(vehicle_sequence) as max_sequence 
                FROM transporter_details
                WHERE request_id = @request_id
              `);
            
            const maxSequence = maxSequenceResult.recordset[0].max_sequence || 0;
            transporterData.vehicle_sequence = maxSequence + 1;
            // Remove console.log statements to prevent showing conflict messages
            // console.log(`Using new sequence ${transporterData.vehicle_sequence} for request ${currentRequestId}`);
          }
        } else {
          // If no new sequence provided, use the current one
          transporterData.vehicle_sequence = currentSequence;
        }
        
        const {
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
          
          seal1,
          seal2,
          container_total_weight,
          cargo_total_weight,
          container_type,
          container_size,
          vehicle_sequence
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
          
          .input("additional_charges", sql.Decimal(12, 2), additional_charges || 0)
          .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
          .input("total_charge", sql.Decimal(12, 2), total_charge)
          .input("container_no", sql.NVarChar(100), container_no || null)
          .input("line", sql.NVarChar(100), line || null)
          .input("seal_no", sql.NVarChar(100), seal_no || null)
          
          .input("seal1", sql.NVarChar(100), seal1 || null)
          .input("seal2", sql.NVarChar(100), seal2 || null)
          .input("container_total_weight", sql.Decimal(12, 2), container_total_weight || null)
          .input("cargo_total_weight", sql.Decimal(12, 2), cargo_total_weight || null)
          .input("container_type", sql.NVarChar(50), container_type || null)
          .input("container_size", sql.NVarChar(20), container_size || null)
          .input("vehicle_sequence", sql.Int, vehicle_sequence)
          .query(`
            UPDATE transporter_details 
            SET 
              transporter_name = @transporter_name,
              vehicle_number = @vehicle_number,
              driver_name = @driver_name,
              driver_contact = @driver_contact,
              license_number = @license_number,
              license_expiry = @license_expiry,
             
              additional_charges = @additional_charges,
              service_charges = @service_charges,
              total_charge = @total_charge,
              container_no = @container_no,
              line = @line,
              seal_no = @seal_no,
             
              seal1 = @seal1,
              seal2 = @seal2,
              container_total_weight = @container_total_weight,
              cargo_total_weight = @cargo_total_weight,
              container_type = @container_type,
              container_size = @container_size,
              updated_at = GETDATE(),
              vehicle_sequence = @vehicle_sequence  
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
        const { 
          container_no, 
          line, 
          seal_no, 
          
          seal1,                 // Add this
          seal2,                 // Add this
          container_total_weight, // Add this
          cargo_total_weight,    // Add this
          container_type,        // Add this
          container_size,        // Add this
          vehicle_number         // Add this if needed
        } = containerData;
  
        const result = await pool
          .request()
          .input("id", sql.Int, id)
          .input("container_no", sql.NVarChar(100), container_no || null)
          .input("line", sql.NVarChar(100), line || null)
          .input("seal_no", sql.NVarChar(100), seal_no || null)
          
          .input("seal1", sql.NVarChar(100), seal1 || null)
          .input("seal2", sql.NVarChar(100), seal2 || null)
          .input("container_total_weight", sql.Decimal(12, 2), container_total_weight || null)
          .input("cargo_total_weight", sql.Decimal(12, 2), cargo_total_weight || null)
          .input("container_type", sql.NVarChar(50), container_type || null)
          .input("container_size", sql.NVarChar(20), container_size || null)
          .query(`
            UPDATE transporter_details 
            SET 
              container_no = @container_no,
              line = @line,
              seal_no = @seal_no,
             
              seal1 = @seal1,
              seal2 = @seal2,
              container_total_weight = @container_total_weight,
              cargo_total_weight = @cargo_total_weight,
              container_type = @container_type,
              container_size = @container_size,
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

  // Get containers by vehicle number for a specific request
  getContainersByVehicleNumber: async (requestId, vehicleNumber) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .input("vehicle_number", sql.NVarChar(50), vehicleNumber)
        .query(`
          SELECT * FROM transporter_details 
          WHERE request_id = @request_id AND vehicle_number = @vehicle_number
          ORDER BY vehicle_sequence
        `);
      return result.recordset;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  },

  // Add multiple containers to a vehicle
  addContainersToVehicle: async (requestId, vehicleNumber, containersData) => {
    try {
      // First, get the vehicle details to ensure it exists
      const vehicleResult = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .input("vehicle_number", sql.NVarChar(50), vehicleNumber)
        .query(`
          SELECT id FROM transporter_details 
          WHERE request_id = @request_id AND vehicle_number = @vehicle_number
        `);
  
      if (vehicleResult.recordset.length === 0) {
        throw new Error("Vehicle not found for this request");
      }
  
      // Process each container in the array
      const results = [];
      for (const containerData of containersData) {
        const {
          container_no,
          line,
          seal_no,
          seal1,
          seal2,
          container_total_weight,
          cargo_total_weight,
          container_type,
          container_size
        } = containerData;
  
        // For each container, create a new transporter_details record with the same vehicle info
        // but different container details
        const vehicleId = vehicleResult.recordset[0].id;
        
        // Get the vehicle details to copy
        const vehicleDetailsResult = await pool
          .request()
          .input("id", sql.Int, vehicleId)
          .query(`
            SELECT 
              transporter_name, vehicle_number, driver_name, driver_contact,
              license_number, license_expiry, additional_charges,
              service_charges, total_charge
            FROM transporter_details 
            WHERE id = @id
          `);
  
        if (vehicleDetailsResult.recordset.length === 0) {
          throw new Error("Vehicle details not found");
        }
  
        const vehicleDetails = vehicleDetailsResult.recordset[0];
  
        // Find the next available sequence number
        const maxSequenceResult = await pool
          .request()
          .input("request_id", sql.Int, requestId)
          .query(`
            SELECT MAX(vehicle_sequence) as max_sequence 
            FROM transporter_details
            WHERE request_id = @request_id
          `);
        
        const maxSequence = maxSequenceResult.recordset[0].max_sequence || 0;
        const nextSequence = maxSequence + 1;
  
        // Insert the new container record
        const insertResult = await pool
          .request()
          .input("request_id", sql.Int, requestId)
          .input("transporter_name", sql.NVarChar(255), vehicleDetails.transporter_name)
          .input("vehicle_number", sql.NVarChar(50), vehicleDetails.vehicle_number)
          .input("driver_name", sql.NVarChar(255), vehicleDetails.driver_name)
          .input("driver_contact", sql.NVarChar(20), vehicleDetails.driver_contact)
          .input("license_number", sql.NVarChar(50), vehicleDetails.license_number)
          .input("license_expiry", sql.Date, new Date(vehicleDetails.license_expiry))
          .input("additional_charges", sql.Decimal(12, 2), vehicleDetails.additional_charges || 0)
          .input("service_charges", sql.NVarChar(sql.MAX), vehicleDetails.service_charges)
          .input("total_charge", sql.Decimal(12, 2), vehicleDetails.total_charge)
          .input("container_no", sql.NVarChar(100), container_no || null)
          .input("line", sql.NVarChar(100), line || null)
          .input("seal_no", sql.NVarChar(100), seal_no || null)
        // Each record represents one container
          .input("seal1", sql.NVarChar(100), seal1 || null)
          .input("seal2", sql.NVarChar(100), seal2 || null)
          .input("container_total_weight", sql.Decimal(12, 2), container_total_weight || null)
          .input("cargo_total_weight", sql.Decimal(12, 2), cargo_total_weight || null)
          .input("container_type", sql.NVarChar(50), container_type || null)
          .input("container_size", sql.NVarChar(20), container_size || null)
          .input("vehicle_sequence", sql.Int, nextSequence)
          .query(`
            INSERT INTO transporter_details (
              request_id, transporter_name, vehicle_number,
              driver_name, driver_contact, license_number, 
              license_expiry, additional_charges, service_charges, total_charge,
              container_no, line, seal_no,  vehicle_sequence,
              seal1, seal2, container_total_weight, cargo_total_weight, container_type, container_size
            )
            OUTPUT INSERTED.*
            VALUES (
              @request_id, @transporter_name, @vehicle_number,
              @driver_name, @driver_contact, @license_number,
              @license_expiry, @additional_charges, @service_charges, @total_charge,
              @container_no, @line, @seal_no, @vehicle_sequence,
              @seal1, @seal2, @container_total_weight, @cargo_total_weight, @container_type, @container_size
            )
          `);
  
        results.push(insertResult.recordset[0]);
      }
  
      return results;
    } catch (error) {
      console.error("Add containers to vehicle error:", error);
      throw error;
    }
  },
  deleteContainer: async (containerId) => {
  try {
    const result = await pool
      .request()
      .input("id", sql.Int, containerId)
      .query(`
        DELETE FROM transporter_details 
        OUTPUT DELETED.*
        WHERE id = @id
      `);

    return result.recordset[0];
  } catch (error) {
    console.error("Delete container error:", error);
    throw error;
  }
}

};

module.exports = transporterModel;


// Delete container
