const express = require("express");
const router = express.Router();
const TransactionController = require("../controller/transactionController");
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");

// Protect all routes with authentication
router.use(auth);

// Create a new transaction (admin only)
router.post("/create", adminAuth, TransactionController.createTransaction);

// Get all transactions (admin only)
router.get("/all", adminAuth, TransactionController.getAllTransactions);

// Get transaction by ID
router.get("/:id", TransactionController.getTransactionById);

// Get transactions by request ID
router.get("/request/:requestId", TransactionController.getTransactionsByRequestId);

// Update transaction payment (admin only)
router.put("/:id/payment", adminAuth, TransactionController.updatePayment);

// Delete transaction (admin only)
router.delete("/:id", adminAuth, TransactionController.deleteTransaction);

module.exports = router;