const express = require('express');
const router = express.Router();
const { estaLogueado, noLogueado } = require('../lib/auth')
const dashboardController = require('../controllers/dashboardController');
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })

// Dashboard Principal
router.get('/', estaLogueado, dashboardController.index)

router.get('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.registroConsultores)
router.post('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.addConsultores)

router.get('/consultores', estaLogueado, dashboardController.mostrarConsultores)

module.exports = router;