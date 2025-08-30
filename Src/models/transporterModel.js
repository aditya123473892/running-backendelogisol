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
      throw error;
    }
  },

  // Check container history
  checkContainerHistory: async (containerNo, currentRequestId = null) => {
    try {
      if (!containerNo || containerNo.trim() === "") {
        return { history: [], lastUsed: null, totalUses: 0 };
      }

      const cleanContainerNo = containerNo.trim();
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
        WHERE td.container_no = @container_no
      `;

      const request = pool
        .request()
        .input("container_no", sql.NVarChar(100), cleanContainerNo);

      if (currentRequestId) {
        query += ` AND td.request_id != @current_request_id`;
        request.input("current_request_id", sql.Int, currentRequestId);
      }

      query += ` ORDER BY td.request_id DESC`;

      const result = await request.query(query);
      const history = result.recordset;

      return {
        history,
        lastUsed: history.length > 0 ? history[0] : null,
        totalUses: history.length,
      };
    } catch (error) {
      return { history: [], lastUsed: null, totalUses: 0 };
    }
  },

  createTransporter: async (transportRequestId, transporterData) => {
    try {
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
              container_no, line, seal_no,  vehicle_sequence,
              seal1, seal2, container_total_weight, cargo_total_weight, container_type, container_size
            )
            OUTPUT INSERTED.*
            VALUES (
              @request_id, @transporter_name, @vehicle_number,
              @driver_name, @driver_contact
              ,@additional_charges, @service_charges, @total_charge,
              @container_no, @line, @seal_no,  @vehicle_sequence,
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

        return result.recordset[0];
      } catch (insertError) {
        // If we get a unique constraint violation, try again with a new sequence
        if (
          insertError.number === 2627 &&
          insertError.message.includes(
            "UQ_transporter_details_request_vehicle_seq"
          )
        ) {
          // Remove console.log statements to prevent showing conflict messages
          // console.log(`Conflict detected for request ${transportRequestId}, sequence ${sequenceToUse}. Retrying with next sequence.`);

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
                container_no, line, seal_no,  vehicle_sequence,
                seal1, seal2, container_total_weight, cargo_total_weight, container_type, container_size
              )
              OUTPUT INSERTED.*
              VALUES (
                @request_id, @transporter_name, @vehicle_number,
                @driver_name, @driver_contact,
                @additional_charges, @service_charges, @total_charge,
                @container_no, @line, @seal_no,  @vehicle_sequence,
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
      const currentRecord = await pool.request().input("id", sql.Int, id)
        .query(`
          SELECT request_id, vehicle_sequence, container_no 
          FROM transporter_details 
          WHERE id = @id
        `);

      if (currentRecord.recordset.length === 0) {
        throw new Error("Transporter record not found");
      }

      const {
        request_id,
        vehicle_sequence,
        container_no: currentContainerNo,
      } = currentRecord.recordset[0];

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
          request_id
        );
      }

      let sequenceToUse = vehicle_sequence;
      if (
        transporterData.vehicle_sequence &&
        transporterData.vehicle_sequence !== vehicle_sequence
      ) {
        const conflictCheck = await pool
          .request()
          .input("request_id", sql.Int, request_id)
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
            .input("request_id", sql.Int, request_id).query(`
              SELECT ISNULL(MAX(vehicle_sequence), 0) + 1 as next_sequence 
              FROM transporter_details
              WHERE request_id = @request_id
            `);
          sequenceToUse = maxSequenceResult.recordset[0].next_sequence;
        } else {
          sequenceToUse = transporterData.vehicle_sequence;
        }
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
        .input("vehicle_sequence", sql.Int, sequenceToUse)
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

      const updatedRow =
        result.recordset[0] ||
        (
          await pool
            .request()
            .input("id", sql.Int, id)
            .query(`SELECT * FROM transporter_details WHERE id = @id`)
        ).recordset[0];

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
      throw error;
    }
  },

  // Update container details
  updateContainerDetails: async (id, containerData) => {
    try {
      const currentRecord = await pool.request().input("id", sql.Int, id)
        .query(`
          SELECT request_id, container_no 
          FROM transporter_details 
          WHERE id = @id
        `);

      if (currentRecord.recordset.length === 0) {
        throw new Error("Container record not found");
      }

      const { request_id, container_no: currentContainerNo } =
        currentRecord.recordset[0];

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
          request_id
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
      throw error;
    }
  },

  // Add multiple containers to a vehicle
  addContainersToVehicle: async (requestId, vehicleNumber, containersData) => {
    try {
      const vehicleResult = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .input("vehicle_number", sql.NVarChar(50), vehicleNumber).query(`
          SELECT 
            id, transporter_name, vehicle_number, driver_name, driver_contact,
            additional_charges, service_charges, total_charge
          FROM transporter_details 
          WHERE request_id = @request_id AND vehicle_number = @vehicle_number
        `);

      if (vehicleResult.recordset.length === 0) {
        throw new Error("Vehicle not found for this request");
      }

      const vehicleDetails = vehicleResult.recordset[0];
      const results = [];

      for (const containerData of containersData) {
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

        const sequenceResult = await pool
          .request()
          .input("request_id", sql.Int, requestId).query(`
            SELECT ISNULL(MAX(vehicle_sequence), 0) + 1 as next_sequence 
            FROM transporter_details
            WHERE request_id = @request_id
          `);

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
          .input(
            "vehicle_sequence",
            sql.Int,
            sequenceResult.recordset[0].next_sequence
          ).query(`
            INSERT INTO transporter_details (
              request_id, transporter_name, vehicle_number, driver_name, driver_contact,
              additional_charges, service_charges, total_charge, container_no, line,
              seal_no, vehicle_sequence, seal1, seal2, container_total_weight,
              cargo_total_weight, container_type, container_size
            )
            OUTPUT INSERTED.*
            VALUES (
              @request_id, @transporter_name, @vehicle_number, @driver_name, @driver_contact,
              @additional_charges, @service_charges, @total_charge, @container_no, @line,
              @seal_no, @vehicle_sequence, @seal1, @seal2, @container_total_weight,
              @cargo_total_weight, @container_type, @container_size
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
      throw error;
    }
  },

  getcontainerbyrequestid: async (requestId) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId).query(`
          SELECT 
            td.*, tr.status as request_status, tr.consignee, tr.consigner,
            u.name as customer_name, u.email as customer_email
          FROM transporter_details td
          INNER JOIN transport_requests tr ON td.request_id = tr.id
          INNER JOIN users u ON tr.customer_id = u.id
          WHERE td.request_id = @request_id
          ORDER BY td.vehicle_sequence
        `);
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  deleteTransporter: async (id) => {
    try {
      const result = await pool.request().input("id", sql.Int, id).query(`
          DELETE FROM transporter_details 
          OUTPUT DELETED.*
          WHERE id = @id
        `);
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  },

  getAllTransporters: async () => {
    try {
      const result = await pool.request().query(`
        SELECT 
          td.*, tr.status as request_status, tr.consignee, tr.consigner,
          u.name as customer_name, u.email as customer_email
        FROM transporter_details td
        INNER JOIN transport_requests tr ON td.request_id = tr.id
        INNER JOIN users u ON tr.customer_id = u.id
        ORDER BY td.created_at DESC
      `);
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  checkTransportRequestExists: async (requestId) => {
    try {
      const result = await pool.request().input("requestId", sql.Int, requestId)
        .query(`
          SELECT id, status 
          FROM transport_requests 
          WHERE id = @requestId
        `);
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  },

  checkTransporterExists: async (requestId) => {
    try {
      const result = await pool.request().input("requestId", sql.Int, requestId)
        .query(`
          SELECT id 
          FROM transporter_details 
          WHERE request_id = @requestId
        `);
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  getContainersByVehicleNumber: async (requestId, vehicleNumber) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .input("vehicle_number", sql.NVarChar(50), vehicleNumber).query(`
          SELECT * 
          FROM transporter_details 
          WHERE request_id = @request_id AND vehicle_number = @vehicle_number
          ORDER BY vehicle_sequence
        `);
      return result.recordset;
    } catch (error) {
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
      throw error;
    }
  },
};

module.exports = transporterModel;
