const { pool, sql } = require("../config/dbconfig");
const TransactionModel = require("../models/TransactionModel");
const PaymentDetailsModel = require("../models/PaymentDetailsModel");

class TransactionController {
  // Create a new transaction
  static async createTransaction(req, res) {
    try {
      const {
        request_id,
        transporter_id,
        gr_no,
        payment_amount,
        payment_mode,
        remarks
      } = req.body;

      // Validate required fields
      if (!request_id || !transporter_id || !gr_no) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: request_id, transporter_id, and gr_no are required",
        });
      }

      // Get transport request details
      const requestDetails = await pool
        .request()
        .input("requestId", sql.Int, request_id)
        .query(`
          SELECT 
            tr.*, 
            u.name as customer_name
          FROM transport_requests tr
          INNER JOIN users u ON tr.customer_id = u.id
          WHERE tr.id = @requestId
        `);

      if (requestDetails.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Transport request not found",
        });
      }
      

      // Get transporter details
      const transporterDetails = await pool
        .request()
        .input("transporterId", sql.Int, transporter_id)
        .query(`
          SELECT * FROM transporter_details
          WHERE id = @transporterId
        `);

      if (transporterDetails.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Transporter details not found",
        });
      }

      const request = requestDetails.recordset[0];
      const transporter = transporterDetails.recordset[0];

      // Parse service_type if it's a string
      let parsedServiceType = request.service_type;
      try {
        if (typeof request.service_type === "string") {
          parsedServiceType = JSON.parse(request.service_type);
        }
      } catch (error) {
        console.error("Error parsing service_type:", error);
        parsedServiceType = ["Transport"];
      }

      // Create transaction data object
      const transactionData = {
        request_id,
        transporter_id,
        gr_no,
        transporter_name: transporter.transporter_name,
        vehicle_number: transporter.vehicle_number,
        driver_name: transporter.driver_name,
        pickup_location: request.pickup_location,
        delivery_location: request.delivery_location,
        consigner: request.consigner,
        consignee: request.consignee,
        service_type: typeof parsedServiceType === "object" ? JSON.stringify(parsedServiceType) : parsedServiceType,
        requested_price: request.requested_price,
        transporter_charge: transporter.total_charge,
        gst_percentage: 18.00, // Default GST percentage
        total_paid: payment_amount || 0,
        last_payment_amount: payment_amount || null,
        last_payment_date: payment_amount ? new Date() : null,
        last_payment_mode: payment_mode || null,
        remarks
      };

      // Create the transaction
      const transaction = await TransactionModel.createTransaction(transactionData);

      return res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        data: transaction,
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating transaction",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get all transactions
  static async getAllTransactions(req, res) {
    try {
      const transactions = await TransactionModel.getAllTransactions();

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error("Get all transactions error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
  // Get transactions by transporter ID
static async getTransactionsByTransporterId(req, res) {
  try {
    const { transporterId } = req.params;
    
    // Query to get transactions by transporter_id
    const result = await pool
      .request()
      .input("transporterId", sql.Int, transporterId)
      .query(`
        SELECT * FROM transport_transaction_master
        WHERE transporter_id = @transporterId
        ORDER BY created_at DESC
      `);

    return res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("Get transactions by transporter ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

  // Get transaction by ID
  static async getTransactionById(req, res) {
    try {
      const { id } = req.params;
      const transaction = await TransactionModel.getTransactionById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error("Get transaction by ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transaction",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get transactions by request ID
  static async getTransactionsByRequestId(req, res) {
    try {
      const { requestId } = req.params;
      const transactions = await TransactionModel.getTransactionsByRequestId(requestId);

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error("Get transactions by request ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update transaction payment
  static async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const { payment_amount, payment_mode, payment_date, remarks } = req.body;
  
      if (!payment_amount || !payment_mode) {
        return res.status(400).json({
          success: false,
          message: "Payment amount and mode are required",
        });
      }
  
      // Generate a unique invoice ID
      const invoiceId = `INV-${id}-${Date.now().toString().slice(-6)}`;
  
      // Update the transaction with new payment total
      const updatedTransaction = await TransactionModel.updatePayment(id, {
        payment_amount,
        payment_mode,
        payment_date: payment_date || new Date(),
        remarks
      });
  
      if (!updatedTransaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }
  
      // Create a payment detail record
      await PaymentDetailsModel.createPayment({
        transaction_id: id,
        invoice_id: invoiceId,
        amount: payment_amount,
        payment_mode,
        payment_date: payment_date || new Date(),
        remarks
      });
  
      return res.status(200).json({
        success: true,
        message: "Payment updated successfully",
        data: updatedTransaction,
      });
    } catch (error) {
      console.error("Update payment error:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating payment",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async getPaymentDetails(req, res) {
    try {
      const { id } = req.params;
      const payments = await PaymentDetailsModel.getPaymentsByTransactionId(id);
  
      return res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Get payment details error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment details",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
  
  // Delete transaction
  static async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      const deletedTransaction = await TransactionModel.deleteTransaction(id);

      if (!deletedTransaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error("Delete transaction error:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting transaction",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
  // Get transactions by vehicle number
static async getTransactionsByVehicleNumber(req, res) {
  try {
    const { vehicleNumber } = req.params;
    
    // Query to get transactions by vehicle_number
    const result = await pool
      .request()
      .input("vehicleNumber", sql.VarChar(50), vehicleNumber)
      .query(`
        SELECT * FROM transport_transaction_master
        WHERE vehicle_number = @vehicleNumber
        ORDER BY created_at DESC
      `);

    return res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("Get transactions by vehicle number error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

static async getTransactionsByCustomerId(req, res) {
  try {
    const { customerId } = req.params;
    
    // Query to get transactions by customer_id from transport_requests
    const result = await pool
      .request()
      .input("customerId", sql.Int, customerId)
      .query(`
        SELECT ttm.*, tr.status as request_status, u.name as customer_name
        FROM transport_transaction_master ttm
        INNER JOIN transport_requests tr ON ttm.request_id = tr.id
        INNER JOIN users u ON tr.customer_id = u.id
        WHERE tr.customer_id = @customerId
        ORDER BY ttm.created_at DESC
      `);

    return res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("Get transactions by customer ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

}


module.exports = TransactionController;

// Get transactions by transporter ID
// Get transactions by customer ID