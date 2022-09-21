const express = require('express');
const router = express.Router();
const consultorController = require('../controllers/consultorController');
const { checkLogin, consultorLogueado } = require('../lib/auth')

// // Dashboard Principal Consultor
router.get('/consultor', checkLogin, consultorLogueado, consultorController.index)
router.get('/empresas-asignadas', checkLogin, consultorLogueado, consultorController.empresasAsignadas)
router.get('/empresas-asignadas/:codigo', checkLogin, consultorLogueado, consultorController.empresaInterna)

// Cuestionario Análisis dimensión Producto 
router.get('/analisis-dimension-producto/:codigo', checkLogin, consultorLogueado, consultorController.analisisProducto)
router.post('/analisis-dimension-producto/',checkLogin, consultorLogueado, consultorController.guardarAnalisisProducto)

// Cuestionario Análisis dimensión Administración 
router.get('/analisis-dimension-administracion/:codigo', checkLogin, consultorLogueado, consultorController.analisisAdministracion)
router.post('/analisis-dimension-administracion', checkLogin, consultorLogueado, consultorController.guardarAnalisisAdministracion)

// Cuestionario Análisis dimensión Operación 
router.get('/analisis-dimension-operaciones/:codigo', checkLogin, consultorLogueado, consultorController.analisisOperacion)
router.post('/analisis-dimension-operaciones', checkLogin, consultorLogueado, consultorController.guardarAnalisisOperacion)

// Cuestionario Análisis dimensión Marketing  
router.get('/analisis-dimension-marketing/:codigo', checkLogin, consultorLogueado, consultorController.analisisMarketing)
router.post('/analisis-dimension-marketing/', checkLogin, consultorLogueado, consultorController.guardarAnalisisMarketing)

module.exports = router