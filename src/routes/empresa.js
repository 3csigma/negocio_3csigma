const express = require('express')
const router = express.Router()
const { estaLogueado, noLogueado } = require('../lib/auth')
const empresaController = require('../controllers/empresaController');
const signingViaEmail = require('../controllers/envelopeController');


router.get('/fichaCliente', estaLogueado, empresaController.fichaCliente)
router.post('/add', estaLogueado, empresaController.add)
// Llenar Editar datos del formulario ficha cliente
router.get('/editar/:id', estaLogueado, empresaController.editar)
router.post('/editar/:id', estaLogueado, empresaController.actualizado)
// Acuerdo de Confidencialidad
router.get('/acuerdo-de-confidencialidad', estaLogueado, empresaController.acuerdo)
router.post('/acuerdo-de-confidencialidad', estaLogueado, signingViaEmail.createController)

module.exports = router