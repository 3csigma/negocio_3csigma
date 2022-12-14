const express = require('express')
const router = express.Router()
const { checkLogin, validarIDFicha } = require('../lib/auth');
const empresaController = require('../controllers/empresaController');
const signingViaEmail = require('../controllers/envelopeController');
const paymentController = require('../controllers/paymentController');
const { uploadFiles } = require('../lib/helpers')

// Dashboard Principal Empresas
// router.get('/', checkLogin, empresaLogueada, empresaController.index)
// router.get('/', checkLogin, chooseController)

/** Proceso de pago - API Stripe */
router.post("/create-payment-intent", checkLogin, paymentController.createPayment)

// Diagnóstico de Negocio
router.get('/diagnostico-de-negocio', checkLogin, empresaController.diagnostico)

// Ficha de Cliente
router.get('/ficha-cliente/:id', checkLogin, empresaController.validarFichaCliente)
router.get('/ficha-cliente', checkLogin, validarIDFicha, empresaController.fichaCliente)
router.post('/addficha', checkLogin, empresaController.addFichaCliente)
router.post('/eliminarFicha', checkLogin, empresaController.eliminarFicha)

// Acuerdo de Confidencialidad
router.get('/acuerdo-de-confidencialidad', checkLogin, empresaController.acuerdo)
router.post('/acuerdo-de-confidencialidad', checkLogin, signingViaEmail.createController)

// Análisis de Negocio
router.get('/analisis-de-negocio', checkLogin, empresaController.analisis)
router.post('/guardar-archivos-analisis', checkLogin, uploadFiles('Analisis-de-negocio_', 'archivosAnalisis[]', 'archivos_analisis_empresa'), empresaController.guardarArchivos)

// Plan Estratégico de Negocio
router.get('/plan-estrategico', checkLogin, empresaController.planEstrategico)

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