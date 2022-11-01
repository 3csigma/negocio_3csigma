const express = require('express')
const router = express.Router()
const { checkLogin, empresaLogueada, validarIDFicha } = require('../lib/auth');
const empresaController = require('../controllers/empresaController');
const signingViaEmail = require('../controllers/envelopeController');
const paymentController = require('../controllers/paymentController');
const { uploadFiles, enabled_nextPay } = require('../lib/helpers')
const cron = require('node-cron');

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
router.post('/guardar-archivos-analisis', checkLogin, empresaLogueada, 
// uploadFiles(preNombre, inputName, carpeta)
uploadFiles('Analisis-de-negocio_', 'archivosAnalisis[]', 'archivos_analisis_empresa'),
empresaController.guardarArchivos)

// Plan Estratégico de Negocio
router.get('/plan-estrategico', checkLogin, empresaLogueada, empresaController.planEstrategico)

/*******************************************************************************************************/
// // Ejecución Diaria (12pm)
// cron.schedule('0 12 * * 0-6',() => {
//     enabled_nextPay()
// });

// // router.get('/update-pay2', (req, res) => {
// //     enabled_nextPay()
// //     res.send("TODO OK -> END")
// // });

module.exports = router