const express = require('express');
const router = express.Router();
const { estaLogueado } = require('../lib/auth')
const pool = require('../database')
const { listEnvelope } = require('../controllers/listEnvelopes');
const dsConfig = require('../config/index.js').config;


router.get('/', estaLogueado, async (req, res) => {
    console.log(dsConfig.args)
    const tipoUser = req.user.rol;
    const id_user = req.user.id;
    let noPago = true, acuerdoFirmado;
    
    const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ?', [id_user])
    if (acuerdo.length > 0) {
        let statusSign;
        if (acuerdo[0].estado == 2) acuerdoFirmado = true;
        if (acuerdo[0].envelopeId){
            await listEnvelope(dsConfig.args, acuerdo[0].envelopeId).then((values) => {
                statusSign = values.envelopes[0].status
                console.log("ESTADO DEL SOBRE ==> ", statusSign)
            })

            if (statusSign == 'completed'){
                noPago = false;
                updateEstado = {estado: 2}
                // Actualizando Estado del acuerdo a 2 (Firmado)
                await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_user = ?', [updateEstado, id_user])
            }
        }
    }

    console.log("ACUERDO INDEX => ", acuerdoFirmado)
    console.log("NO HA PAGADO PAGO => ", noPago)
    res.render('dashboard', {dashx: true, wizarx: false, tipoUser, noPago, itemActivo: 1, acuerdoFirmado})
})

router.get('/perfil', estaLogueado, (req, res) => {
    res.render('perfil', {dashx: true, wizarx: false, login: false})
})

// router.get('/token', (req, res) => {
//     helpers.authToken();
// })

module.exports = router;