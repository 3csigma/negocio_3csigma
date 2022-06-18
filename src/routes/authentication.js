const express = require('express');
const router = express.Router();
const { checkLogin, noLogueado } = require('../lib/auth')
const userController = require('../controllers/userController');
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })
const passport = require('passport')

router.get('/registro', noLogueado, csrfProtection, userController.getRegistro)

router.post('/registro', noLogueado, csrfProtection, userController.postRegistro)

router.get('/confirmar/:codigo', noLogueado, csrfProtection, userController.confirmarRegistro)

router.get('/login', noLogueado, csrfProtection, userController.getLogin)

//router.post('/login', noLogueado, csrfProtection, userController.postLogin)

router.post('/login', noLogueado, csrfProtection, passport.authenticate('local.login', {
    failureRedirect: '/login',
    failureFlash: true,
}), (req, res) => {
    console.log(req.user) // Datos de sesión del usuario actual.
    if (req.user.rol == 'Empresa'){
        res.redirect('/')
    } else {
        res.redirect('/admin')
    }
})

/** Cerrar Sesión */
router.get('/logout', checkLogin, userController.cerrarSesion)

module.exports = router;