const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const userController = require('../controllers/userController');
const { checkLogin, noLogueado, requireRole } = require('../lib/auth')
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })
const multer = require('multer');
const path = require('path');
const cron = require('node-cron');
const { habilitar_siguientePago, historial_consultores_admin, historial_empresas_admin, historial_informes_admin, historial_informes_consultor, historial_empresas_consultor, historial_empresas_tutor, historial_informes_tutor, consultar_tiempo_tareas, uploadFiles } = require('../lib/helpers')

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

// Dashboard Principal
router.get('/', requireRole)

// Perfil de Usuarios
router.post('/updateProfile', checkLogin, userController.update_user);
router.post('/actualizarFotoPerfil', checkLogin, cargarFotoPerfil.single('foto'), userController.actualizarFotoPerfil);

// Dashboard Principal Administrador
// router.get('/admin', checkLogin, adminLogueado, dashboardController.admin)
router.get('/registro-de-consultores', noLogueado, csrfProtection, dashboardController.registroConsultores)
router.post('/registro-de-consultores', noLogueado, subirArchivo.single('certificadoConsul'), csrfProtection, dashboardController.addConsultores)

// Consultores Admin
router.get('/consultores', checkLogin, dashboardController.mostrarConsultores)
router.get('/consultores/:codigo', checkLogin, dashboardController.editarConsultor)
router.post('/actualizarConsultor', checkLogin, dashboardController.actualizarConsultor)
router.post('/bloquearConsultor', checkLogin, dashboardController.bloquearConsultor)
router.post('/eliminarConsultor', checkLogin, dashboardController.eliminarConsultor)

// Empresas Admin
router.get('/empresas', checkLogin, dashboardController.mostrarEmpresas)
router.get('/empresas/:codigo', checkLogin, dashboardController.editarEmpresa)
router.get('/empresas-asignadas/:codigo', checkLogin, dashboardController.editarEmpresa)
router.get('/estudiantes-asignados/:codigo', checkLogin, dashboardController.editarEmpresa)
router.post('/actualizarEmpresa', checkLogin, dashboardController.actualizarEmpresa)
router.post('/bloquearEmpresa', checkLogin, dashboardController.bloquearEmpresa)
router.post('/eliminarEmpresa', checkLogin, dashboardController.eliminarEmpresa)
router.post('/conclusiones', checkLogin, dashboardController.conclusiones)
router.post('/correcciones', checkLogin, dashboardController.correcciones)
router.post('/correcciones-aprobadas', checkLogin, dashboardController.correccionesAprobadas)
// PAGOS MANUALES (EXTERNOS)
router.post('/pagoManual-Diagnostico', checkLogin, dashboardController.pagoManualDiagnostico)
router.post('/pagoManual-Empresas', checkLogin, dashboardController.pagoManualEmpresas)
// Cuestionario Diagnóstico Empresa Establecida
router.get('/cuestionario-diagnostico/:codigo', checkLogin, dashboardController.cuestionario)
router.post('/cuestionario-diagnostico', checkLogin, dashboardController.enviarCuestionario)

// Cuestionario Diagnóstico Empresa Nueva
router.get('/diagnostico-proyecto/:codigo', checkLogin, dashboardController.dgNuevosProyectos)
router.post('/diagnostico-proyecto/', checkLogin, dashboardController.guardarRespuestas)

// SUBIR INFORMES DE TODAS LAS ETAPAS
router.post('/guardarInforme', checkLogin, dashboardController.subirInforme, dashboardController.guardarInforme)

/********************************************************************************
 * PLAN EMPRESARIAL
 */
// SUBIR ARCHIVOS PARA PLAN EMPRESARIAL
router.post('/guardar-archivos-empresarial', checkLogin, uploadFiles('Plan-Empresarial_', false, 'archivos_plan_empresarial', false), dashboardController.guardarArchivo_Empresarial)
// SUBIR ARCHIVOS PARA PLAN EMPRESARIAL
router.post('/website-empresarial', checkLogin, dashboardController.websiteEmpresarial)
// FINALIZAR ETAPA DE PLAN EMPRESARIAL
router.post('/finalizarEtapa', checkLogin, dashboardController.finalizarEtapa)

/*******************************************************************************************************/
// Ejecución Diaria (12pm)
cron.schedule('0 12 * * 0-6',() => {
    habilitar_siguientePago()
});

// Ejecución Mensual
cron.schedule('0 1 1 * *',() => {
    historial_empresas_admin();
    historial_consultores_admin();
    historial_informes_admin();
    historial_empresas_consultor();
    historial_informes_consultor();
    historial_empresas_tutor();
    historial_informes_tutor();
});

router.post('/historial_informes_tutor', historial_informes_tutor)

// Ejecución Semanal
cron.schedule('0 10 * * Mon',() => {
    consultar_tiempo_tareas();
});

router.get('/retrasadas', (req, res) => {
    consultar_tiempo_tareas()
    res.send("TODO OK -> END consultar_tiempo_tareas")
});

router.get('/consultarPagos', (req, res) => {
    habilitar_siguientePago()
    res.send("Consulta de pagos pendientes (ANÁLISIS Y EMPRESARIAL) finalizada.. -> Todo Ok")
});

module.exports = router;