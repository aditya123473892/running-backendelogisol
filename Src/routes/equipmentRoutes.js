const express = require("express");
const router = express.Router();
const EquipmentController = require("../controller/equipmentController");
const auth = require("../middlewares/auth");

router.get("/equipment", auth, EquipmentController.getAllEquipment);

router.get("/equipment/:id", auth, EquipmentController.getEquipmentById);

router.post("/equipment", auth, EquipmentController.createEquipment);

router.put("/equipment/:id", auth, EquipmentController.updateEquipment);

router.delete("/equipment/:id", auth, EquipmentController.deleteEquipment);

module.exports = router;