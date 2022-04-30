const express = require('express')
const router = express.Router()
const { estaLogueado, validarIDFicha } = require('../lib/auth')
const empresaController = require('../controllers/empresaController');
const signingViaEmail = require('../controllers/envelopeController');

// Diagnóstico de Negocio
router.get('/diagnostico-de-negocio', estaLogueado, empresaController.diagnostico)
// Ficha de Cliente
router.get('/ficha-cliente/:id', estaLogueado, empresaController.validarFichaCliente)
router.get('/ficha-cliente', estaLogueado, validarIDFicha, empresaController.fichaCliente)
router.post('/addficha', estaLogueado, empresaController.addFichaCliente)
// Llenar Editar datos del formulario ficha cliente
router.get('/editar/:id', estaLogueado, empresaController.editar)
router.post('/editar/:id', estaLogueado, empresaController.actualizado)
// Acuerdo de Confidencialidad
router.get('/acuerdo-de-confidencialidad', estaLogueado, empresaController.acuerdo)
router.post('/acuerdo-de-confidencialidad', estaLogueado, signingViaEmail.createController)

module.exports = router