const express = require("express");
const router = express.Router();
const TransactionController = require("../controller/transactionController");
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");

router.use(auth);


// Create a new transaction (allow both admin and customer)
router.post("/create", TransactionController.createTransaction);

router.post("/create", adminAuth, TransactionController.createTransaction);


router.get("/all", adminAuth, TransactionController.getAllTransactions);

router.get("/:id", TransactionController.getTransactionById);

router.get("/request/:requestId", TransactionController.getTransactionsByRequestId);


router.put("/:id/payment", TransactionController.updatePayment);

router.put("/:id/payment", adminAuth, TransactionController.updatePayment);


router.delete("/:id", adminAuth, TransactionController.deleteTransaction);

router.get("/:id/payments", TransactionController.getPaymentDetails);

router.get('/transactions/transporter/:transporterId', TransactionController.getTransactionsByTransporterId);


router.get('/transporter/:transporterId', TransactionController.getTransactionsByTransporterId);
// Add this line with your other routes
router.get('/vehicle/:vehicleNumber', TransactionController.getTransactionsByVehicleNumber);

module.exports = router;