const express = require('express');
const router = express.Router();
const { checkLogin, noLogueado } = require('../lib/auth')
const userController = require('../controllers/userController');
const empresaController = require('../controllers/empresaController');
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })
const passport = require('passport')

router.get('/registro', noLogueado, csrfProtection, userController.getRegistro)

router.post('/registro', noLogueado, csrfProtection, userController.postRegistro)

router.get('/confirmar/:codigo', noLogueado, csrfProtection, userController.confirmarRegistro)

router.get('/login', noLogueado, csrfProtection, userController.getLogin)

router.post('/login', noLogueado, csrfProtection, passport.authenticate('local.login', {
    failureRedirect: '/login',
    failureFlash: true,
}), (req, res) => {
    console.log(req.user) // Datos de sesión del usuario actual.
    res.redirect('/')
})

/** Cerrar Sesión */
router.get('/logout', checkLogin, userController.cerrarSesion)

// Restablecer Clave de Usuario
router.get('/restablecer-clave', csrfProtection, userController.getrestablecerClave)

/* RUTA DONDE SE COLOCARÁ LA NUEVA CLAVE DE LA CUENTA */
router.get('/reset-password', noLogueado, csrfProtection, userController.getresetPassword)

/* Enviar link de la clave al correo */
router.post('/reset-password-email', noLogueado, userController.resetPassword)

/* Actualizar clave en la Base de datos */
router.post('/update-password', noLogueado, csrfProtection,userController.updatePassword)

router.get('/perfil/:codigo', checkLogin, empresaController.perfilUsuarios)

module.exports = router;