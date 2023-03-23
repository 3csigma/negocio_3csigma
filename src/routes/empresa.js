const express = require('express')
const router = express.Router()
const { checkLogin, validarIDFicha } = require('../lib/auth');
const empresaController = require('../controllers/empresaController');
// const signingViaEmail = require('../controllers/envelopeController');
const { uploadFiles } = require('../lib/helpers')

// Diagnóstico de Negocio
router.get('/diagnostico-de-negocio', checkLogin, empresaController.diagnostico)

// Ficha de Cliente
router.get('/ficha-cliente/:id', checkLogin, empresaController.validarFichaCliente)
router.get('/ficha-cliente', checkLogin, validarIDFicha, empresaController.fichaCliente)
router.post('/addficha', checkLogin, empresaController.addFichaCliente)
router.post('/eliminarFicha', checkLogin, empresaController.eliminarFicha)

// Acuerdo de Confidencialidad
// router.post('/acuerdo-de-confidencialidad', checkLogin, signingViaEmail.createController)
router.post('/acuerdo-de-confidencialidad', checkLogin, empresaController.acuerdoCheck)

// Análisis de Negocio
router.get('/analisis-de-negocio', checkLogin, empresaController.analisis)
router.post('/guardar-archivos-analisis', checkLogin, uploadFiles('Análisis-de-negocio_', false, 'archivos_analisis_empresa', false), empresaController.guardarArchivos)

// Plan Empresarial
router.get('/plan-empresarial', checkLogin, empresaController.planEmpresarial)
router.post('/guardar-archivos-empresarial', checkLogin, uploadFiles('Plan-empresarial_', false, 'archivos_empresarial_empresa', false), empresaController.guardarArchivos)

// Plan Estratégico de Negocio
router.get('/plan-estrategico', checkLogin, empresaController.planEstrategico)
router.post('/guardar-archivos-estrategico', checkLogin, uploadFiles('Plan-estratégico_', false, 'archivos_estrategico_empresa', false), empresaController.guardarArchivos)

module.exports = router