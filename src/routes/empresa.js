const express = require('express')
const router = express.Router()
const { estaLogueado, validarIDFicha } = require('../lib/auth')
const empresaController = require('../controllers/empresaController');
const signingViaEmail = require('../controllers/envelopeController');
const paymentController = require('../controllers/paymentController');

/** Proceso de pago - API Stripe */
router.post("/create-payment-intent", estaLogueado, paymentController.createPayment)
// Diagnóstico de Negocio
router.get('/diagnostico-de-negocio', estaLogueado, empresaController.diagnostico)
// Ficha de Cliente
router.get('/ficha-cliente/:id', estaLogueado, empresaController.validarFichaCliente)
router.get('/ficha-cliente', estaLogueado, validarIDFicha, empresaController.fichaCliente)
router.post('/addficha', estaLogueado, empresaController.addFichaCliente)
router.post('/eliminarFicha', estaLogueado, empresaController.eliminarFicha)
// Acuerdo de Confidencialidad
router.get('/acuerdo-de-confidencialidad', estaLogueado, empresaController.acuerdo)
router.post('/acuerdo-de-confidencialidad', estaLogueado, signingViaEmail.createController)

module.exports = router