const express = require('express');
const router = express.Router();
const { estaLogueado } = require('../lib/auth')
const helpers = require('../lib/helpers')
const pool = require('../database')


router.get('/', estaLogueado, async (req, res) => {
    const tipoUser = req.user.rol;
    const id_user = req.user.id;
    let acuerdoFirmado;
    const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ?', [id_user])
    if (acuerdo.length > 0) {
        if (acuerdo[0].estado == 2) acuerdoFirmado = true;
    }
    console.log("ACUERDO INDEX => ", acuerdoFirmado)
    res.render('dashboard', {dashx: true, wizarx: false, tipoUser, noPago: true, itemActivo: 1, acuerdoFirmado})
})

router.get('/perfil', estaLogueado, (req, res) => {
    res.render('perfil', {dashx: true, wizarx: false, login: false})
})

router.get('/token', (req, res) => {
    helpers.authToken();
})

module.exports = router;