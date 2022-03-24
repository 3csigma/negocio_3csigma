const express = require('express');
const router = express.Router();
const { estaLogueado, noLogueado } = require('../lib/auth')

router.get('/', estaLogueado, (req, res) => {
    // res.send("Hola Desde Dashboard")
    res.render('dashboard', {dashx: true, wizarx: false})
})

module.exports = router;