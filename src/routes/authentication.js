const express = require('express');
const router = express.Router();
const { estaLogueado, noLogueado, validarRegistro } = require('../lib/auth')
const userController = require('../controllers/userController');
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })

router.get('/registro', noLogueado, csrfProtection, userController.getRegistro)

router.post('/registro', noLogueado, csrfProtection, userController.postRegistro)

router.get('/confirmar/:codigo', noLogueado, csrfProtection, userController.confirmarRegistro)

router.get('/login', noLogueado, csrfProtection, userController.getLogin)

router.post('/login', noLogueado, csrfProtection, userController.postLogin)

/** Cerrar Sesión */
router.get('/logout', estaLogueado, userController.cerrarSesion)

module.exports = router;