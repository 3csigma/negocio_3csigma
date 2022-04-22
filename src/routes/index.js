const express = require('express');
const router = express.Router();
const { estaLogueado } = require('../lib/auth')
const empresaController = require('../controllers/empresaController');
const paymentController = require('../controllers/paymentController');


/** Dashboard Principal */
router.get('/', estaLogueado, empresaController.dashboard)

/** Proceso de pago - API Stripe */
router.post("/create-payment-intent", estaLogueado, paymentController.createPayment)


router.get('/perfil', estaLogueado, (req, res) => {
    res.render('profile', {dashx: true, wizarx: false, login: false})
})

router.get('/pagar-diagnostico-de-negocio', estaLogueado, (req, res) => {
    res.render('pago1', {dashx: true, wizarx: false, login: false, stripe: true})
})

router.get('/exito', estaLogueado, (req, res) => {
    res.send('<h2>Se ha realizado el pago con exito</h2>')
})

module.exports = router;