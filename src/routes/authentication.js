const express = require('express');
const router = express.Router();
const { estaLogueado, noLogueado, validarRegistro } = require('../lib/auth')
const userController = require('../controllers/userController');

router.get('/registro', noLogueado, userController.getRegistro)

router.post('/registro', noLogueado, userController.postRegistro)

router.get('/confirmar/:codigo', noLogueado, userController.confirmarRegistro)

router.get('/login', noLogueado,  userController.getLogin)

router.post('/login', noLogueado, userController.postLogin)

/** Cerrar Sesión */
router.get('/logout', estaLogueado, userController.cerrarSesion)

module.exports = router;