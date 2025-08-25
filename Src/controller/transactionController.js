const { pool, sql } = require("../config/dbconfig");
const TransactionModel = require("../models/TransactionModel");
const PaymentDetailsModel = require("../models/PaymentDetailsModel");
const transporter = require("../config/Mailer"); // Import your email transporter

class TransactionController {
  // Helper method to send email notification
  static async sendTransactionEmail(transactionData) {
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .details-table th, .details-table td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
            }
            .details-table th { background-color: #f2f2f2; }
            .amount-highlight { 
              background-color: #fff3cd; 
              font-weight: bold; 
              font-size: 16px; 
            }
            .footer { margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>New Transport Transaction Created</h2>
            <p>Payment Required - GR No: ${transactionData.gr_no}</p>
          </div>
          
          <div class="content">
            <h3>Transaction Details</h3>
            <table class="details-table">
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
              <tr>
                <td><strong>Transaction ID</strong></td>
                <td>${transactionData.id}</td>
              </tr>
              <tr>
                <td><strong>GR Number</strong></td>
                <td>${transactionData.gr_no}</td>
              </tr>
              <tr>
                <td><strong>Request ID</strong></td>
                <td>${transactionData.request_id}</td>
              </tr>
              <tr>
                <td><strong>Transporter Name</strong></td>
                <td>${transactionData.transporter_name}</td>
              </tr>
              <tr>
                <td><strong>Vehicle Number</strong></td>
                <td>${transactionData.vehicle_number}</td>
              </tr>
              <tr>
                <td><strong>Driver Name</strong></td>
                <td>${transactionData.driver_name}</td>
              </tr>
              <tr>
                <td><strong>Pickup Location</strong></td>
                <td>${transactionData.pickup_location}</td>
              </tr>
              <tr>
                <td><strong>Delivery Location</strong></td>
                <td>${transactionData.delivery_location}</td>
              </tr>
              <tr>
                <td><strong>Consigner</strong></td>
                <td>${transactionData.consigner}</td>
              </tr>
              <tr>
                <td><strong>Consignee</strong></td>
                <td>${transactionData.consignee}</td>
              </tr>
              <tr>
                <td><strong>Service Type</strong></td>
                <td>${transactionData.service_type}</td>
              </tr>
              <tr>
                <td><strong>Requested Price</strong></td>
                <td>₹${parseFloat(transactionData.requested_price || 0).toFixed(
                  2
                )}</td>
              </tr>
              <tr>
                <td><strong>Transporter Charge</strong></td>
                <td>₹${parseFloat(
                  transactionData.transporter_charge || 0
                ).toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>GST Percentage</strong></td>
                <td>${transactionData.gst_percentage}%</td>
              </tr>
              <tr class="amount-highlight">
                <td><strong>Total Amount to Pay</strong></td>
                <td>₹${parseFloat(
                  transactionData.transporter_charge || 0
                ).toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Amount Already Paid</strong></td>
                <td>₹${parseFloat(transactionData.total_paid || 0).toFixed(
                  2
                )}</td>
              </tr>
              <tr class="amount-highlight">
                <td><strong>Outstanding Amount</strong></td>
                <td>₹${(
                  parseFloat(transactionData.transporter_charge || 0) -
                  parseFloat(transactionData.total_paid || 0)
                ).toFixed(2)}</td>
              </tr>
              ${
                transactionData.remarks
                  ? `
              <tr>
                <td><strong>Remarks</strong></td>
                <td>${transactionData.remarks}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td><strong>Created Date</strong></td>
                <td>${new Date().toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</td>
              </tr>
            </table>

            ${
              transactionData.last_payment_amount &&
              parseFloat(transactionData.last_payment_amount) > 0
                ? `
            <h3>Latest Payment Details</h3>
            <table class="details-table">
              <tr>
                <td><strong>Last Payment Amount</strong></td>
                <td>₹${parseFloat(transactionData.last_payment_amount).toFixed(
                  2
                )}</td>
              </tr>
              <tr>
                <td><strong>Payment Mode</strong></td>
                <td>${transactionData.last_payment_mode}</td>
              </tr>
              <tr>
                <td><strong>Payment Date</strong></td>
                <td>${new Date(
                  transactionData.last_payment_date
                ).toLocaleDateString("en-IN")}</td>
              </tr>
            </table>
            `
                : "<p><strong>Note:</strong> No payment has been made yet for this transaction.</p>"
            }
          </div>

          <div class="footer">
            <p>This is an automated notification from the Transport Management System.</p>
            <p>Please process the payment as per company policy.</p>
            <p>For any queries, please contact the operations team.</p>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: "adityathakur6199@gmail.com",
        subject: `New Transaction - Payment Required | GR: ${
          transactionData.gr_no
        } | Amount: ₹${parseFloat(
          transactionData.transporter_charge || 0
        ).toFixed(2)}`,
        html: emailHtml,
        attachments: [], // You can add attachments if needed
      };

      await transporter.sendMail(mailOptions);
      console.log(
        "Transaction notification email sent successfully to accounts team"
      );
    } catch (emailError) {
      console.error(
        "Error sending transaction notification email:",
        emailError
      );
      // Don't throw error here as we don't want email failure to break transaction creation
    }
  }

  // Create a new transaction
  static async createTransaction(req, res) {
    try {
      const {
        request_id,
        transporter_id,
        gr_no,
        payment_amount,
        payment_mode,
        remarks,
      } = req.body;

      // Validate required fields
      if (!request_id || !transporter_id || !gr_no) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: request_id, transporter_id, and gr_no are required",
        });
      }

      // Get transport request details
      const requestDetails = await pool
        .request()
        .input("requestId", sql.Int, request_id).query(`
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
        .input("transporterId", sql.Int, transporter_id).query(`
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
        service_type:
          typeof parsedServiceType === "object"
            ? JSON.stringify(parsedServiceType)
            : parsedServiceType,
        requested_price: request.requested_price,
        transporter_charge: transporter.total_charge,
        gst_percentage: 18.0, // Default GST percentage
        total_paid: payment_amount || 0,
        last_payment_amount: payment_amount || null,
        last_payment_date: payment_amount ? new Date() : null,
        last_payment_mode: payment_mode || null,
        remarks,
      };

      // Create the transaction
      const transaction = await TransactionModel.createTransaction(
        transactionData
      );

      // Send email notification to accounts team
      await TransactionController.sendTransactionEmail({
        ...transactionData,
        id: transaction.id || "N/A", // Include the transaction ID from the created transaction
      });

      return res.status(201).json({
        success: true,
        message:
          "Transaction created successfully and notification sent to accounts team",
        data: transaction,
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating transaction",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
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
        .input("transporterId", sql.Int, transporterId).query(`
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get transactions by request ID
  static async getTransactionsByRequestId(req, res) {
    try {
      const { requestId } = req.params;
      const transactions = await TransactionModel.getTransactionsByRequestId(
        requestId
      );

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error("Get transactions by request ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
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
        remarks,
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
        remarks,
      });

      // Send payment update email notification
      try {
        const paymentUpdateEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .payment-info { 
                background-color: #d4edda; 
                border: 1px solid #c3e6cb; 
                padding: 15px; 
                margin: 20px 0; 
                border-radius: 5px; 
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Payment Updated - Transaction ID: ${id}</h2>
            </div>
            <div class="content">
              <div class="payment-info">
                <h3>Payment Details</h3>
                <p><strong>Invoice ID:</strong> ${invoiceId}</p>
                <p><strong>Payment Amount:</strong> ₹${parseFloat(
                  payment_amount
                ).toFixed(2)}</p>
                <p><strong>Payment Mode:</strong> ${payment_mode}</p>
                <p><strong>Payment Date:</strong> ${new Date(
                  payment_date || new Date()
                ).toLocaleDateString("en-IN")}</p>
                ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ""}
              </div>
            </div>
          </body>
          </html>
        `;

        const paymentMailOptions = {
          from: process.env.EMAIL_USER,
          to: "adityathakur6199@gmail.com",
          subject: `Payment Updated | Transaction ID: ${id} | Amount: ₹${parseFloat(
            payment_amount
          ).toFixed(2)}`,
          html: paymentUpdateEmailHtml,
        };

        await transporter.sendMail(paymentMailOptions);
      } catch (emailError) {
        console.error("Error sending payment update email:", emailError);
      }

      return res.status(200).json({
        success: true,
        message: "Payment updated successfully and notification sent",
        data: updatedTransaction,
      });
    } catch (error) {
      console.error("Update payment error:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating payment",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
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
        .input("vehicleNumber", sql.VarChar(50), vehicleNumber).query(`
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async getTransactionsByCustomerId(req, res) {
    try {
      const { customerId } = req.params;

      // Query to get transactions by customer_id from transport_requests
      const result = await pool
        .request()
        .input("customerId", sql.Int, customerId).query(`
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = TransactionController;
