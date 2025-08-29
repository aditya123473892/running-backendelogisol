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

  // Helper method to check container history
  checkContainerHistory: async (containerNo, currentRequestId = null) => {
    try {
      if (!containerNo || containerNo.trim() === "") {
        return { history: [], lastUsed: null, totalUses: 0 };
      }

      // Clean and trim the container number
      const cleanContainerNo = containerNo.trim();

      console.log(
        `Checking history for container: "${cleanContainerNo}", excluding request: ${currentRequestId}`
      );

      // First, let's check ALL uses of this container (including current request for debugging)
      const allUsesQuery = `
        SELECT 
          td.request_id,
          td.container_no,
          td.created_at
        FROM transporter_details td
        WHERE td.container_no IS NOT NULL 
        AND LTRIM(RTRIM(td.container_no)) = @container_no
        ORDER BY td.request_id DESC
      `;

      const allUsesResult = await pool
        .request()
        .input("container_no", sql.NVarChar(100), cleanContainerNo)
        .query(allUsesQuery);

      console.log(
        `Container "${cleanContainerNo}" found in these requests:`,
        allUsesResult.recordset.map((r) => ({
          request_id: r.request_id,
          created_at: r.created_at,
        }))
      );

      // Now get the history excluding current request
      let query = `
        SELECT 
          td.id,
          td.request_id,
          td.container_no,
          td.vehicle_number,
          td.transporter_name,
          td.driver_name,
          td.created_at,
          tr.consignee,
          tr.consigner,
          tr.status as request_status
        FROM transporter_details td
        INNER JOIN transport_requests tr ON td.request_id = tr.id
        WHERE td.container_no IS NOT NULL 
        AND LTRIM(RTRIM(td.container_no)) = @container_no
      `;

      const request = pool
        .request()
        .input("container_no", sql.NVarChar(100), cleanContainerNo);

      // If checking for a specific request, exclude it from results
      if (currentRequestId) {
        query += ` AND td.request_id != @current_request_id`;
        request.input("current_request_id", sql.Int, currentRequestId);
      }

      query += ` ORDER BY td.request_id DESC`;

      console.log("Executing filtered query:", query);
      const result = await request.query(query);
      const history = result.recordset;

      console.log(
        `Found ${history.length} previous uses for container "${cleanContainerNo}" (excluding current request ${currentRequestId})`
      );
      if (history.length > 0) {
        console.log("Latest previous use in request:", history[0].request_id);
      } else {
        console.log(
          `No previous uses found for container "${cleanContainerNo}" outside of request ${currentRequestId}`
        );
      }

      return {
        history: history,
        lastUsed: history.length > 0 ? history[0] : null,
        totalUses: history.length,
      };
    } catch (error) {
      console.error("Check container history error:", error);
      console.error("Container No:", containerNo);
      console.error("Current Request ID:", currentRequestId);
      return { history: [], lastUsed: null, totalUses: 0 };
    }
  },

  // Create new transporter details with container history check
  createTransporter: async (transportRequestId, transporterData) => {
    try {
      // Check container history before creating
      let containerHistoryResult = {
        history: [],
        lastUsed: null,
        totalUses: 0,
      };
      if (transporterData.container_no) {
        containerHistoryResult = await transporterModel.checkContainerHistory(
          transporterData.container_no,
          transportRequestId
        );
      }

      // Always find the next available sequence number first
      const maxSequenceResult = await pool
        .request()
        .input("request_id", sql.Int, transportRequestId).query(`
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
      } = transporterData;

      // For existing requests, always use nextSequence to avoid conflicts
      let sequenceToUse = nextSequence;
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

          .input(
            "additional_charges",
            sql.Decimal(12, 2),
            additional_charges || 0
          )
          .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
          .input("total_charge", sql.Decimal(12, 2), total_charge)
          .input("container_no", sql.NVarChar(100), container_no || null)
          .input("line", sql.NVarChar(100), line || null)
          .input("seal_no", sql.NVarChar(100), seal_no || null)
          .input("seal1", sql.NVarChar(100), seal1 || null)
          .input("seal2", sql.NVarChar(100), seal2 || null)
          .input(
            "container_total_weight",
            sql.Decimal(12, 2),
            container_total_weight || null
          )
          .input(
            "cargo_total_weight",
            sql.Decimal(12, 2),
            cargo_total_weight || null
          )
          .input("container_type", sql.NVarChar(50), container_type || null)
          .input("container_size", sql.NVarChar(20), container_size || null)
          .input("vehicle_sequence", sql.Int, sequenceToUse).query(`
            INSERT INTO transporter_details (
              request_id, transporter_name, vehicle_number,
              driver_name, driver_contact,
              additional_charges, service_charges, total_charge,
              container_no, line, seal_no, vehicle_sequence,
              seal1, seal2, container_total_weight, cargo_total_weight, container_type, container_size
            )
            OUTPUT INSERTED.*
            VALUES (
              @request_id, @transporter_name, @vehicle_number,
              @driver_name, @driver_contact,
              @additional_charges, @service_charges, @total_charge,
              @container_no, @line, @seal_no, @vehicle_sequence,
              @seal1, @seal2, @container_total_weight, @cargo_total_weight, @container_type, @container_size
            )
          `);

        // Update the transport request status to 'Vehicle Assigned'
        await pool.request().input("request_id", sql.Int, transportRequestId)
          .query(`
            UPDATE transport_requests
            SET status = 'Vehicle Assigned', updated_at = GETDATE()
            WHERE id = @request_id
          `);

        // Return the created record with container history
        return {
          transporterDetails: result.recordset[0],
          containerHistory: containerHistoryResult.history,
          lastUsedIn: containerHistoryResult.lastUsed,
          containerAlreadyUsed: containerHistoryResult.totalUses > 0,
          totalPreviousUses: containerHistoryResult.totalUses,
          message:
            containerHistoryResult.totalUses > 0
              ? `Warning: Container ${container_no} was last used in Request #${containerHistoryResult.lastUsed.request_id} (Total: ${containerHistoryResult.totalUses} previous use(s))`
              : null,
        };
      } catch (insertError) {
        // Handle unique constraint violation with retry logic
        if (
          insertError.number === 2627 &&
          insertError.message.includes(
            "UQ_transporter_details_request_vehicle_seq"
          )
        ) {
          const retryMaxSequenceResult = await pool
            .request()
            .input("request_id", sql.Int, transportRequestId).query(`
              SELECT MAX(vehicle_sequence) as max_sequence 
              FROM transporter_details
              WHERE request_id = @request_id
            `);

          const retryMaxSequence =
            retryMaxSequenceResult.recordset[0].max_sequence || 0;
          const retryNextSequence = retryMaxSequence + 1;

          const retryResult = await pool
            .request()
            .input("request_id", sql.Int, transportRequestId)
            .input("transporter_name", sql.NVarChar(255), transporter_name)
            .input("vehicle_number", sql.NVarChar(50), vehicle_number)
            .input("driver_name", sql.NVarChar(255), driver_name)
            .input("driver_contact", sql.NVarChar(20), driver_contact)

            .input(
              "additional_charges",
              sql.Decimal(12, 2),
              additional_charges || 0
            )
            .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
            .input("total_charge", sql.Decimal(12, 2), total_charge)
            .input("container_no", sql.NVarChar(100), container_no || null)
            .input("line", sql.NVarChar(100), line || null)
            .input("seal_no", sql.NVarChar(100), seal_no || null)
            .input("seal1", sql.NVarChar(100), seal1 || null)
            .input("seal2", sql.NVarChar(100), seal2 || null)
            .input(
              "container_total_weight",
              sql.Decimal(12, 2),
              container_total_weight || null
            )
            .input(
              "cargo_total_weight",
              sql.Decimal(12, 2),
              cargo_total_weight || null
            )
            .input("container_type", sql.NVarChar(50), container_type || null)
            .input("container_size", sql.NVarChar(20), container_size || null)
            .input("vehicle_sequence", sql.Int, retryNextSequence).query(`
              INSERT INTO transporter_details (
                request_id, transporter_name, vehicle_number,
                driver_name, driver_contact,
                additional_charges, service_charges, total_charge,
                container_no, line, seal_no, vehicle_sequence,
                seal1, seal2, container_total_weight, cargo_total_weight, container_type, container_size
              )
              OUTPUT INSERTED.*
              VALUES (
                @request_id, @transporter_name, @vehicle_number,
                @driver_name, @driver_contact,
                @additional_charges, @service_charges, @total_charge,
                @container_no, @line, @seal_no, @vehicle_sequence,
                @seal1, @seal2, @container_total_weight, @cargo_total_weight, @container_type, @container_size
              )
            `);

          await pool.request().input("request_id", sql.Int, transportRequestId)
            .query(`
              UPDATE transport_requests
              SET status = 'Vehicle Assigned', updated_at = GETDATE()
              WHERE id = @request_id
            `);

          return {
            transporterDetails: retryResult.recordset[0],
            containerHistory: containerHistoryResult.history,
            lastUsedIn: containerHistoryResult.lastUsed,
            containerAlreadyUsed: containerHistoryResult.totalUses > 0,
            totalPreviousUses: containerHistoryResult.totalUses,
            message:
              containerHistoryResult.totalUses > 0
                ? `Warning: Container ${container_no} was last used in Request #${containerHistoryResult.lastUsed.request_id} (Total: ${containerHistoryResult.totalUses} previous use(s))`
                : null,
          };
        } else {
          throw insertError;
        }
      }
    } catch (error) {
      console.error("Create transporter error:", error);
      throw error;
    }
  },

  // Update existing transporter details with container history check
  updateTransporter: async (id, transporterData) => {
    try {
      // First, get the current record to preserve its vehicle_sequence if not changing
      const currentRecord = await pool.request().input("id", sql.Int, id)
        .query(`
          SELECT request_id, vehicle_sequence, container_no FROM transporter_details 
          WHERE id = @id
        `);

      if (currentRecord.recordset.length === 0) {
        throw new Error("Transporter record not found");
      }

      const currentRequestId = currentRecord.recordset[0].request_id;
      const currentSequence = currentRecord.recordset[0].vehicle_sequence;
      const currentContainerNo = currentRecord.recordset[0].container_no;

      // Check container history if container number is being changed
      let containerHistoryResult = {
        history: [],
        lastUsed: null,
        totalUses: 0,
      };
      if (
        transporterData.container_no &&
        transporterData.container_no !== currentContainerNo
      ) {
        containerHistoryResult = await transporterModel.checkContainerHistory(
          transporterData.container_no,
          currentRequestId
        );
      }

      // Handle vehicle sequence conflicts
      if (
        transporterData.vehicle_sequence &&
        transporterData.vehicle_sequence !== currentSequence
      ) {
        const conflictCheck = await pool
          .request()
          .input("request_id", sql.Int, currentRequestId)
          .input("vehicle_sequence", sql.Int, transporterData.vehicle_sequence)
          .input("id", sql.Int, id).query(`
            SELECT id FROM transporter_details
            WHERE request_id = @request_id 
            AND vehicle_sequence = @vehicle_sequence
            AND id != @id
          `);

        if (conflictCheck.recordset.length > 0) {
          const maxSequenceResult = await pool
            .request()
            .input("request_id", sql.Int, currentRequestId).query(`
              SELECT MAX(vehicle_sequence) as max_sequence 
              FROM transporter_details
              WHERE request_id = @request_id
            `);

          const maxSequence = maxSequenceResult.recordset[0].max_sequence || 0;
          transporterData.vehicle_sequence = maxSequence + 1;
        }
      } else {
        transporterData.vehicle_sequence = currentSequence;
      }

      const {
        transporter_name,
        vehicle_number,
        driver_name,
        driver_contact,

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
        vehicle_sequence,
        Vin_no,
      } = transporterData;

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("transporter_name", sql.NVarChar(255), transporter_name)
        .input("vehicle_number", sql.NVarChar(50), vehicle_number)
        .input("driver_name", sql.NVarChar(255), driver_name)
        .input("driver_contact", sql.NVarChar(20), driver_contact)

        .input(
          "additional_charges",
          sql.Decimal(12, 2),
          additional_charges || 0
        )
        .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
        .input("total_charge", sql.Decimal(12, 2), total_charge)
        .input("container_no", sql.NVarChar(100), container_no || null)
        .input("line", sql.NVarChar(100), line || null)
        .input("seal_no", sql.NVarChar(100), seal_no || null)
        .input("seal1", sql.NVarChar(100), seal1 || null)
        .input("seal2", sql.NVarChar(100), seal2 || null)
        .input(
          "container_total_weight",
          sql.Decimal(12, 2),
          container_total_weight || null
        )
        .input(
          "cargo_total_weight",
          sql.Decimal(12, 2),
          cargo_total_weight || null
        )
        .input("container_type", sql.NVarChar(50), container_type || null)
        .input("container_size", sql.NVarChar(20), container_size || null)
        .input("vehicle_sequence", sql.Int, vehicle_sequence)
        // vin could be alphanumeric; use NVARCHAR to avoid type mismatch
        .input("vin_no", sql.NVarChar(100), Vin_no || null).query(`
          UPDATE transporter_details 
          SET 
            transporter_name = @transporter_name,
            vehicle_number = @vehicle_number,
            driver_name = @driver_name,
            driver_contact = @driver_contact,
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
            vehicle_sequence = @vehicle_sequence,
            vin_no = @vin_no  
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      // If OUTPUT didn't return a row for any reason, fetch the updated row as fallback
      let updatedRow = null;
      if (result && result.recordset && result.recordset.length > 0) {
        updatedRow = result.recordset[0];
      } else {
        const fetchResult = await pool.request().input("id", sql.Int, id)
          .query(`
          SELECT * FROM transporter_details WHERE id = @id
        `);
        updatedRow = fetchResult.recordset[0] || null;
      }

      // Return the updated record with container history
      return {
        transporterDetails: updatedRow,
        containerHistory: containerHistoryResult.history,
        lastUsedIn: containerHistoryResult.lastUsed,
        containerAlreadyUsed: containerHistoryResult.totalUses > 0,
        totalPreviousUses: containerHistoryResult.totalUses,
        message:
          containerHistoryResult.totalUses > 0
            ? `Warning: Container ${container_no} was last used in Request #${containerHistoryResult.lastUsed.request_id} (Total: ${containerHistoryResult.totalUses} previous use(s))`
            : null,
      };
    } catch (error) {
      console.error("Update transporter error:", error);
      throw error;
    }
  },

  // Update container details only with history check
  updateContainerDetails: async (id, containerData) => {
    try {
      // Get current container info
      const currentRecord = await pool.request().input("id", sql.Int, id)
        .query(`
          SELECT request_id, container_no FROM transporter_details 
          WHERE id = @id
        `);

      if (currentRecord.recordset.length === 0) {
        throw new Error("Container record not found");
      }

      const currentRequestId = currentRecord.recordset[0].request_id;
      const currentContainerNo = currentRecord.recordset[0].container_no;

      // Check container history if container number is being changed
      let containerHistoryResult = {
        history: [],
        lastUsed: null,
        totalUses: 0,
      };
      if (
        containerData.container_no &&
        containerData.container_no !== currentContainerNo
      ) {
        containerHistoryResult = await transporterModel.checkContainerHistory(
          containerData.container_no,
          currentRequestId
        );
      }

      const {
        container_no,
        line,
        seal_no,
        seal1,
        seal2,
        container_total_weight,
        cargo_total_weight,
        container_type,
        container_size,
        vehicle_number,
      } = containerData;

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("container_no", sql.NVarChar(100), container_no || null)
        .input("line", sql.NVarChar(100), line || null)
        .input("seal_no", sql.NVarChar(100), seal_no || null)
        .input("seal1", sql.NVarChar(100), seal1 || null)
        .input("seal2", sql.NVarChar(100), seal2 || null)
        .input(
          "container_total_weight",
          sql.Decimal(12, 2),
          container_total_weight || null
        )
        .input(
          "cargo_total_weight",
          sql.Decimal(12, 2),
          cargo_total_weight || null
        )
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

      return {
        containerDetails: result.recordset[0],
        containerHistory: containerHistoryResult.history,
        lastUsedIn: containerHistoryResult.lastUsed,
        containerAlreadyUsed: containerHistoryResult.totalUses > 0,
        totalPreviousUses: containerHistoryResult.totalUses,
        message:
          containerHistoryResult.totalUses > 0
            ? `Warning: Container ${container_no} was last used in Request #${containerHistoryResult.lastUsed.request_id} (Total: ${containerHistoryResult.totalUses} previous use(s))`
            : null,
      };
    } catch (error) {
      console.error("Update container details error:", error);
      throw error;
    }
  },

  // Add multiple containers to a vehicle with history check
  addContainersToVehicle: async (requestId, vehicleNumber, containersData) => {
    try {
      // First, get the vehicle details to ensure it exists
      const vehicleResult = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .input("vehicle_number", sql.NVarChar(50), vehicleNumber).query(`
          SELECT id FROM transporter_details 
          WHERE request_id = @request_id AND vehicle_number = @vehicle_number
        `);

      if (vehicleResult.recordset.length === 0) {
        throw new Error("Vehicle not found for this request");
      }

      const vehicleId = vehicleResult.recordset[0].id;

      // Get the vehicle details to copy
      const vehicleDetailsResult = await pool
        .request()
        .input("id", sql.Int, vehicleId).query(`
          SELECT 
            transporter_name, vehicle_number, driver_name, driver_contact,
              additional_charges,
            service_charges, total_charge
          FROM transporter_details 
          WHERE id = @id
        `);

      if (vehicleDetailsResult.recordset.length === 0) {
        throw new Error("Vehicle details not found");
      }

      const vehicleDetails = vehicleDetailsResult.recordset[0];
      const results = [];

      // Process each container in the array
      for (const containerData of containersData) {
        // Check container history for each container
        let containerHistoryResult = {
          history: [],
          lastUsed: null,
          totalUses: 0,
        };
        if (containerData.container_no) {
          containerHistoryResult = await transporterModel.checkContainerHistory(
            containerData.container_no,
            requestId
          );
        }

        const {
          container_no,
          line,
          seal_no,
          seal1,
          seal2,
          container_total_weight,
          cargo_total_weight,
          container_type,
          container_size,
        } = containerData;

        // Find the next available sequence number
        const maxSequenceResult = await pool
          .request()
          .input("request_id", sql.Int, requestId).query(`
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
          .input(
            "transporter_name",
            sql.NVarChar(255),
            vehicleDetails.transporter_name
          )
          .input(
            "vehicle_number",
            sql.NVarChar(50),
            vehicleDetails.vehicle_number
          )
          .input("driver_name", sql.NVarChar(255), vehicleDetails.driver_name)
          .input(
            "driver_contact",
            sql.NVarChar(20),
            vehicleDetails.driver_contact
          )
          .input(
            "license_number",
            sql.NVarChar(50),
            vehicleDetails.license_number
          )
          .input(
            "license_expiry",
            sql.Date,
            new Date(vehicleDetails.license_expiry)
          )
          .input(
            "additional_charges",
            sql.Decimal(12, 2),
            vehicleDetails.additional_charges || 0
          )
          .input(
            "service_charges",
            sql.NVarChar(sql.MAX),
            vehicleDetails.service_charges
          )
          .input(
            "total_charge",
            sql.Decimal(12, 2),
            vehicleDetails.total_charge
          )
          .input("container_no", sql.NVarChar(100), container_no || null)
          .input("line", sql.NVarChar(100), line || null)
          .input("seal_no", sql.NVarChar(100), seal_no || null)
          .input("seal1", sql.NVarChar(100), seal1 || null)
          .input("seal2", sql.NVarChar(100), seal2 || null)
          .input(
            "container_total_weight",
            sql.Decimal(12, 2),
            container_total_weight || null
          )
          .input(
            "cargo_total_weight",
            sql.Decimal(12, 2),
            cargo_total_weight || null
          )
          .input("container_type", sql.NVarChar(50), container_type || null)
          .input("container_size", sql.NVarChar(20), container_size || null)
          .input("vehicle_sequence", sql.Int, nextSequence).query(`
            INSERT INTO transporter_details (
              request_id, transporter_name, vehicle_number,
              driver_name, driver_contact,
              additional_charges, service_charges, total_charge,
              container_no, line, seal_no, vehicle_sequence,
              seal1, seal2, container_total_weight, cargo_total_weight, container_type, container_size
            )
            OUTPUT INSERTED.*
            VALUES (
              @request_id, @transporter_name, @vehicle_number,
              @driver_name, @driver_contact,
              @additional_charges, @service_charges, @total_charge,
              @container_no, @line, @seal_no, @vehicle_sequence,
              @seal1, @seal2, @container_total_weight, @cargo_total_weight, @container_type, @container_size
            )
          `);

        results.push({
          containerDetails: insertResult.recordset[0],
          containerHistory: containerHistoryResult.history,
          lastUsedIn: containerHistoryResult.lastUsed,
          containerAlreadyUsed: containerHistoryResult.totalUses > 0,
          totalPreviousUses: containerHistoryResult.totalUses,
          message:
            containerHistoryResult.totalUses > 0
              ? `Warning: Container ${container_no} was last used in Request #${containerHistoryResult.lastUsed.request_id} (Total: ${containerHistoryResult.totalUses} previous use(s))`
              : null,
        });
      }

      return {
        containers: results,
        hasWarnings: results.some((r) => r.containerAlreadyUsed),
      };
    } catch (error) {
      console.error("Add containers to vehicle error:", error);
      throw error;
    }
  },

  getcontainerbyrequestid: async (requestId) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId).query(`
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
          WHERE td.request_id = @request_id
          ORDER BY td.vehicle_sequence
        `);
      return result.recordset;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  },

  // Keep all other existing methods unchanged...
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

  getContainersByVehicleNumber: async (requestId, vehicleNumber) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .input("vehicle_number", sql.NVarChar(50), vehicleNumber).query(`
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

  deleteContainer: async (containerId) => {
    try {
      const result = await pool.request().input("id", sql.Int, containerId)
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
  },
};

module.exports = transporterModel;
