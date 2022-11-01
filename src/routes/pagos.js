const pagosController = require('../controllers/pagosController');
const express = require('express');
const router = express.Router();
const { checkLogin, validarURLPagar, empresaLogueada } = require('../lib/auth')


// const MY_DOMAIN = 'http://localhost:4000';
router.post('/create-checkout-session', checkLogin, empresaLogueada, pagosController.pagarDiagnostico)

/** PAGO A STRIPE - ANÁLISIS DE NEGOCIO */
router.post('/checkout-etapa2', checkLogin, empresaLogueada, pagosController.pagarAnalisisCompleto);

/** PAGO 1 ANÁLISIS PORCENTAJE 60% */
router.post('/pagar-analisis-per1', checkLogin, empresaLogueada, pagosController.pagarAnalisis_parte1);

/** PAGO 2 ANÁLISIS PORCENTAJE 20% */
router.post('/pagar-analisis-per2', checkLogin, empresaLogueada, pagosController.pagarAnalisis_parte2);

/** PAGO 3 ANÁLISIS PORCENTAJE 20% */
router.post('/pagar-analisis-per3', checkLogin, pagosController.pagarAnalisis_parte3);

router.get('/pago-exitoso', checkLogin, validarURLPagar, empresaLogueada, pagosController.pagoExitoso)

router.get('/pago-cancelado', checkLogin, validarURLPagar, empresaLogueada, pagosController.pagoCancelado)

module.exports = router