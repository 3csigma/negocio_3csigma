const express = require('express');
const router = express.Router();
const { estaLogueado, noLogueado } = require('../lib/auth')

router.get('/', estaLogueado, (req, res) => {
    // res.send("Hola Desde Dashboard")
    // Validación de tipo de Usuario
    /** if (req.user.rol == 'Admin') {
     * tipoUser = 'Admin'
     * }else{ tipoUser = 'User' } */
    res.render('dashboard', {dashx: true, wizarx: false, tipoUser: 'User'})
})

router.get('/perfil', estaLogueado, (req, res) => {
    res.render('perfil', {dashx: true, wizarx: false})
})

module.exports = router;