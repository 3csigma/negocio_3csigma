const express = require('express');
const router = express.Router();
const consultorController = require('../controllers/consultorController');
const { checkLogin, consultorLogueado } = require('../lib/auth')

// // Dashboard Principal Consultor
router.get('/consultor', checkLogin, consultorLogueado, consultorController.index)
router.get('/empresas-asignadas', checkLogin, consultorLogueado, consultorController.empresasAsignadas)
router.get('/empresas-asignadas/:codigo', checkLogin, consultorLogueado, consultorController.empresaInterna)

module.exports = router