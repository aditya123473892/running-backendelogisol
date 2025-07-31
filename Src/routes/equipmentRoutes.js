const express = require("express");
const router = express.Router();
const EquipmentController = require("../controller/equipmentController");
const auth = require("../middlewares/auth");

// Get all equipment
router.get("/equipment", auth, EquipmentController.getAllEquipment);

// Get equipment by ID
router.get("/equipment/:id", auth, EquipmentController.getEquipmentById);

// Create new equipment
router.post("/equipment", auth, EquipmentController.createEquipment);

// Update equipment
router.put("/equipment/:id", auth, EquipmentController.updateEquipment);

// Delete equipment
router.delete("/equipment/:id", auth, EquipmentController.deleteEquipment);

module.exports = router;