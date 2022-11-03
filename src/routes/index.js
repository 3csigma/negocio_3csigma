const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { actualizarFotoPerfil, update_user } = require('../controllers/userController');
const { checkLogin, noLogueado, adminLogueado, consultorLogueado } = require('../lib/auth')
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })
const multer = require('multer');
const path = require('path');
const cron = require('node-cron');
const { enabled_nextPay, historial_consultores_admin, historial_empresas_admin, historial_informes_admin, historial_informes_consultor, historial_empresas_consultor, consultar_tiempo_tareas } = require('../lib/helpers')

/** SUBIR CERTIFICADOS CONSULTORES */
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


// ===================

// todo ===>> Cambiar foto de perfil
const rutaCarpetas = multer.diskStorage({

    destination: function (req, file, callback) {
        const ruta = path.join(__dirname, '../public/foto_profile')
        callback(null, ruta);
    },

    filename: function (req, file, callback) {
        const fechaActual = Math.floor(Date.now() / 1000)
        urlProfile = "foto_Actualizada" + "_" + fechaActual + "_" + file.originalname;
        callback(null, urlProfile)

        if(!file.originalname){
            urlProfile = ''
        }
    }
});

const cargarFotoPerfil = multer({ storage: rutaCarpetas});

// Perfil de Usuarios
router.post('/updateProfile', checkLogin, update_user);
router.post('/actualizarFotoPerfil', checkLogin, cargarFotoPerfil.single('foto'), actualizarFotoPerfil);

// Dashboard Principal Administrador
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
router.post('/pagoManual-Diagnostico', checkLogin, adminLogueado, dashboardController.pagoManualDiagnostico)

// Cuestionario Diagnóstico Empresa Establecida
router.get('/cuestionario-diagnostico/:codigo', checkLogin, consultorLogueado, dashboardController.cuestionario)
router.post('/cuestionario-diagnostico', checkLogin, consultorLogueado, dashboardController.enviarCuestionario)

// Cuestionario Diagnóstico Empresa Nueva
router.get('/diagnostico-proyecto/:codigo', checkLogin, consultorLogueado, dashboardController.dgNuevosProyectos)
router.post('/diagnostico-proyecto/', checkLogin, consultorLogueado, dashboardController.guardarRespuestas)

// Informes Diagnóstico & Análisis 
// router.post('/subirInforme', checkLogin, consultorLogueado, dashboardController.subirInforme)
router.post('/guardarInforme', checkLogin, consultorLogueado, dashboardController.subirInforme, dashboardController.guardarInforme)

/*******************************************************************************************************/
// Ejecución Diaria (12pm)
cron.schedule('0 12 * * 0-6',() => {
    enabled_nextPay()
});

// Ejecución Mensual
cron.schedule('0 1 1 * *',() => {
    historial_empresas_admin();
    historial_consultores_admin();
    historial_informes_admin();
    historial_empresas_consultor();
    historial_informes_consultor();
});

// Ejecución Semanal
cron.schedule('0 10 * * Mon',() => {
    consultar_tiempo_tareas();
});

router.get('/retrasadas', (req, res) => {
    consultar_tiempo_tareas()
    res.send("TODO OK -> END consultar_tiempo_tareas")
});

router.get('/consultarPagos', (req, res) => {
    enabled_nextPay()
    res.send("Consulta de pagos pendientes finalizada.. -> Todo Ok")
});

module.exports = router;