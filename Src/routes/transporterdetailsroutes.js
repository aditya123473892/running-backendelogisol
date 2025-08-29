const express = require("express");
const router = express.Router();
const TransporterController = require("../controller/transporterController");
const auth = require("../middlewares/auth");

// Create transporter details
router.post(
  "/transport-requests/:requestId/transporter",
  auth,
  TransporterController.createTransporterDetails
);

// Get transporter details by request ID
router.get(
  "/transport-requests/:requestId/transporter",
  auth,
  TransporterController.getTransporterDetailsByRequestId
);

// Update transporter details
router.put(
  "/transporter/:id",
  auth,
  TransporterController.updateTransporterDetails
);

// Update container details only
router.put(
  "/transporter/:id/container",
  auth,
  TransporterController.updateContainerDetails
);

// Get containers by vehicle number for a specific request
router.get(
  "/transport-requests/:requestId/vehicle/:vehicleNumber/containers",
  auth,
  TransporterController.getContainersByVehicleNumber
);

router.get(
  "/transport-requests/:requestId/containers",
  auth,
  TransporterController.getContainersByRequestId
);

// Add multiple containers to a vehicle
router.post(
  "/transport-requests/:requestId/vehicle/:vehicleNumber/containers",
  auth,
  TransporterController.addContainersToVehicle
);

// Delete container
router.delete(
  "/transporter/container/:id",
  auth,
  TransporterController.deleteContainer
);

module.exports = router;
