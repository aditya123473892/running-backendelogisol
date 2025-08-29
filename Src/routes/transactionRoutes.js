const express = require("express");
const router = express.Router();
const TransactionController = require("../controller/transactionController");
const auth = require("../middlewares/auth");

// Create a new transaction
router.post("/create", TransactionController.createTransaction);

// Get all transactions (admin only)
router.get("/all", TransactionController.getAllTransactions);

// Get transaction by ID
router.get("/:id", TransactionController.getTransactionById);

// Get transactions by request ID
router.get(
  "/request/:requestId",
  TransactionController.getTransactionsByRequestId
);

// Update transaction payment
router.put("/:id/payment", TransactionController.updatePayment);

// Delete transaction (admin only)
router.delete("/:id", TransactionController.deleteTransaction);

// Get payment details for a transaction
router.get("/:id/payments", TransactionController.getPaymentDetails);

// Get transactions by transporter ID
router.get(
  "/transporter/:transporterId",
  TransactionController.getTransactionsByTransporterId
);

// Get transactions by vehicle number
router.get(
  "/vehicle/:vehicleNumber",
  TransactionController.getTransactionsByVehicleNumber
);

// Get customer transactions (new endpoint)
router.get(
  "/customer/:customerId",
  TransactionController.getTransactionsByCustomerId
);

module.exports = router;
