const { pool, sql } = require("../config/dbconfig");

class PaymentDetailsModel {
  // Create a new payment record
  static async createPayment(paymentData) {
    try {
      const {
        transaction_id,
        invoice_id,
        amount,
        payment_mode,
        payment_date,
        remarks
      } = paymentData;

      const result = await pool
        .request()
        .input("transaction_id", sql.Int, transaction_id)
        .input("invoice_id", sql.NVarChar(100), invoice_id)
        .input("amount", sql.Decimal(12, 2), amount)
        .input("payment_mode", sql.NVarChar(50), payment_mode)
        .input("payment_date", sql.DateTime, new Date(payment_date || Date.now()))
        .input("remarks", sql.NVarChar(500), remarks || null)
        .query(`
          INSERT INTO payment_details (
            transaction_id, invoice_id, amount, payment_mode, payment_date, remarks
          )
          OUTPUT INSERTED.*
          VALUES (
            @transaction_id, @invoice_id, @amount, @payment_mode, @payment_date, @remarks
          )
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Create payment error:", error);
      throw error;
    }
  }

  // Get all payments for a transaction
  static async getPaymentsByTransactionId(transactionId) {
    try {
      const result = await pool
        .request()
        .input("transactionId", sql.Int, transactionId)
        .query(`
          SELECT * FROM payment_details
          WHERE transaction_id = @transactionId
          ORDER BY payment_date DESC
        `);

      return result.recordset;
    } catch (error) {
      console.error("Get payments by transaction ID error:", error);
      throw error;
    }
  }
}

module.exports = PaymentDetailsModel;