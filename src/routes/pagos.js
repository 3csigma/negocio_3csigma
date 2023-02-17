const pagosController = require('../controllers/pagosController');
const express = require('express');
const router = express.Router();
const { checkLogin, validarURLPagar } = require('../lib/auth')

router.post('/pagar-diagnostico', checkLogin, pagosController.pagarDiagnostico)

/**********************************************************************************
 *  PAGOS - ANÁLISIS DE NEGOCIO
 */
router.post('/pagar-analisis', checkLogin, pagosController.pagarAnalisisCompleto);
/** PAGO 1 ANÁLISIS PORCENTAJE 60% */
router.post('/pagar-analisis-per1', checkLogin, pagosController.pagarAnalisis_parte1);
/** PAGO 2 ANÁLISIS PORCENTAJE 20% */
router.post('/pagar-analisis-per2', checkLogin, pagosController.pagarAnalisis_parte2);
/** PAGO 3 ANÁLISIS PORCENTAJE 20% */
router.post('/pagar-analisis-per3', checkLogin, pagosController.pagarAnalisis_parte3);

/**********************************************************************************
 *  PAGOS - PLAN EMPRESARIAL
 */
router.post('/pagar-empresarial', checkLogin, pagosController.pagarEmpresarialCompleto);
/** PAGO 1 ANÁLISIS PORCENTAJE 60% */
router.post('/pagar-empresarial-per1', checkLogin, pagosController.pagarEmpresarial_parte1);
/** PAGO 2 ANÁLISIS PORCENTAJE 20% */
router.post('/pagar-empresarial-per2', checkLogin, pagosController.pagarEmpresarial_parte2);
/** PAGO 3 ANÁLISIS PORCENTAJE 20% */
router.post('/pagar-empresarial-per3', checkLogin, pagosController.pagarEmpresarial_parte3);

/** PAGO PLAN ESTRATÉGICO DE NEGOCIO */
router.post('/pagar-plan-estrategico', checkLogin, pagosController.pagarPlanEstrategico);

//CANCELAR SUUBSCRIPCIÓN
router.post('/cancelarSub', checkLogin, pagosController.cancelarSub)

// PAGO EXITOSO Y CANCELADO
router.get('/pago-exitoso', checkLogin, validarURLPagar, pagosController.pagoExitoso)
router.get('/pago-cancelado', checkLogin, validarURLPagar, pagosController.pagoCancelado)

module.exports = router