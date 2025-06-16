const express = require("express");
const router = express.Router();
const TransactionController = require("../controller/transactionController");
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");

// Protect all routes with authentication
router.use(auth);

// Create a new transaction (allow both admin and customer)
router.post("/create", TransactionController.createTransaction);

// Get all transactions (admin only)
router.get("/all", adminAuth, TransactionController.getAllTransactions);

// Get transaction by ID
router.get("/:id", TransactionController.getTransactionById);

// Get transactions by request ID
router.get("/request/:requestId", TransactionController.getTransactionsByRequestId);

// Update transaction payment (allow both admin and customer)
router.put("/:id/payment", TransactionController.updatePayment);

// Delete transaction (admin only)
router.delete("/:id", adminAuth, TransactionController.deleteTransaction);

module.exports = router;