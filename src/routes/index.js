const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { checkLogin, noLogueado, adminLogueado, empresaLogueada } = require('../lib/auth')
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })
const multer = require('multer');
const path = require('path');

/** Subir Archivos */
const rutaAlmacen = multer.diskStorage({
    destination: function (req, file, callback) {
        const rutaCertificado = path.join(__dirname, '../public/certificados_consultores')
        callback(null, rutaCertificado);
    },

    filename: function (req, file, callback) {
        const fechaActual = Math.floor(Date.now() / 1000)
         urlCertificado = "Consul_International_Group_" + fechaActual + "_" + file.originalname;
        console.log(urlCertificado)
        callback(null, urlCertificado)
    }

});

const subirArchivo = multer({ storage: rutaAlmacen })

// // Dashboard Principal Administrador
router.get('/admin', checkLogin, adminLogueado, dashboardController.admin)

router.get('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.registroConsultores)
router.post('/registro-de-consultores', noLogueado, subirArchivo.single('certificadoConsul'), csrfProtection, dashboardController.addConsultores)

// Consultores Admin
router.get('/consultores', checkLogin, adminLogueado, dashboardController.mostrarConsultores)
router.get('/consultores/:codigo', checkLogin, adminLogueado, dashboardController.editarConsultor)
router.post('/actualizarConsultor', checkLogin, adminLogueado, dashboardController.actualizarConsultor)

router.post('/bloquearConsultor', checkLogin, adminLogueado, dashboardController.bloquearConsultor)

// Empresas Admin
router.get('/empresas', checkLogin, adminLogueado, dashboardController.mostrarEmpresas)
router.get('/empresas/:codigo', checkLogin, adminLogueado, dashboardController.editarEmpresa)
router.post('/actualizarEmpresa', checkLogin, adminLogueado, dashboardController.actualizarEmpresa)

router.post('/bloquearEmpresa', checkLogin, adminLogueado, dashboardController.bloquearEmpresa)

module.exports = router;