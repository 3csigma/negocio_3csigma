const express = require('express')
const router = express.Router()
const { checkLogin, empresaLogueada, validarIDFicha } = require('../lib/auth');
const empresaController = require('../controllers/empresaController');
const signingViaEmail = require('../controllers/envelopeController');
const paymentController = require('../controllers/paymentController');
const { uploadFiles } = require('../lib/helpers')

// Dashboard Principal Empresas
router.get('/', checkLogin, empresaLogueada, empresaController.index)

/** Proceso de pago - API Stripe */
router.post("/create-payment-intent", checkLogin, empresaLogueada, paymentController.createPayment)

// Diagnóstico de Negocio
router.get('/diagnostico-de-negocio', checkLogin, empresaLogueada, empresaController.diagnostico)

// Ficha de Cliente
router.get('/ficha-cliente/:id', checkLogin, empresaLogueada, empresaController.validarFichaCliente)
router.get('/ficha-cliente', checkLogin, validarIDFicha, empresaLogueada, empresaController.fichaCliente)
router.post('/addficha', checkLogin, empresaLogueada, empresaController.addFichaCliente)
router.post('/eliminarFicha', checkLogin, empresaLogueada, empresaController.eliminarFicha)

// Acuerdo de Confidencialidad
router.get('/acuerdo-de-confidencialidad', checkLogin, empresaLogueada, empresaController.acuerdo)
router.post('/acuerdo-de-confidencialidad', checkLogin, empresaLogueada, signingViaEmail.createController)

// Análisis de Negocio
router.get('/analisis-de-negocio', checkLogin, empresaLogueada, empresaController.analisis)
// uploadFiles(preNombre, inputName, carpeta)
router.post('/guardar-archivos-analisis', checkLogin, empresaLogueada, uploadFiles('Analisis-de-negocio_', 'archivosAnalisis[]', 'archivos_analisis_empresa'), empresaController.guardarArchivos)

module.exports = router