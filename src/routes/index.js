const express = require('express');
const router = express.Router();
const { estaLogueado, noLogueado } = require('../lib/auth')

router.get('/', estaLogueado, (req, res) => {
    // res.send("Hola Desde Dashboard")
    res.render('dashboard', {dashx: true, wizarx: false})
})

router.get('/perfil', estaLogueado, (req, res) => {
    // res.send("Hola Desde Dashboard")
    res.render('perfil', {dashx: true, wizarx: false})
})

module.exports = router;