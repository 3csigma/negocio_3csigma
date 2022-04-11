const express = require('express');
const router = express.Router();
const { estaLogueado, noLogueado } = require('../lib/auth')
const helpers = require('../lib/helpers')


router.get('/', estaLogueado, (req, res) => {
    let tipoUser = req.user.rol;
    // req.user.rol == 'Admin'  ? tipoUser = 'Admin' : tipoUser = 'User'; // Validación de tipo de Usuario
    res.render('dashboard', {dashx: true, wizarx: false, tipoUser, noPago: true, itemActivo: 1})
})

router.get('/perfil', estaLogueado, (req, res) => {
    res.render('perfil', {dashx: true, wizarx: false, login: false})
})

router.get('/token', (req, res) => {
    helpers.authToken();
})

module.exports = router;