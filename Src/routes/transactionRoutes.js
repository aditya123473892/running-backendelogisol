const express = require("express");
const router = express.Router();
const TransactionController = require("../controller/transactionController");
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");

router.use(auth);

router.post("/create", adminAuth, TransactionController.createTransaction);

router.get("/all", adminAuth, TransactionController.getAllTransactions);

router.get("/:id", TransactionController.getTransactionById);

router.get("/request/:requestId", TransactionController.getTransactionsByRequestId);

router.put("/:id/payment", adminAuth, TransactionController.updatePayment);

router.delete("/:id", adminAuth, TransactionController.deleteTransaction);

// Add this route
router.get("/:id/payments", TransactionController.getPaymentDetails);

module.exports = router;