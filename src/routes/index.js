const express = require('express');
const router = express.Router();
const { checkLogin, activeLogin, noLogueado, adminLogueado } = require('../lib/auth')
const dashboardController = require('../controllers/dashboardController');
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })

// Dashboard Principal
router.get('/', checkLogin, activeLogin, dashboardController.index)

router.get('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.registroConsultores)
router.post('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.addConsultores)

// Consultores Admin
router.get('/consultores', checkLogin, adminLogueado, dashboardController.mostrarConsultores)
router.get('/consultores/:codigo', checkLogin, adminLogueado, dashboardController.editarConsultor)
router.post('/actualizarConsultor', checkLogin, adminLogueado, dashboardController.actualizarConsultor)

// Empresas Admin
router.get('/empresas', checkLogin, adminLogueado, dashboardController.mostrarEmpresas)
router.get('/empresas/:codigo', checkLogin, adminLogueado, dashboardController.editarEmpresa)
router.post('/actualizarEmpresa', checkLogin, adminLogueado, dashboardController.actualizarEmpresa)

module.exports = router;