const express = require('express')
const router = express.Router()
const { estaLogueado, noLogueado } = require('../lib/auth')
const empresaController = require('../controllers/empresaController');

router.get('/fichaCliente', estaLogueado, empresaController.fichaCliente)
router.post('/add', estaLogueado, empresaController.add)
// Llenar Editar datos del formulario ficha cliente
router.get('/editar/:id', estaLogueado, empresaController.editar)
router.post('/editar/:id', estaLogueado, empresaController.actualizado)

module.exports = router