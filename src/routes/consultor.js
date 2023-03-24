const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const consultorController = require('../controllers/consultorController');
const { checkLogin } = require('../lib/auth')

// Dashboard Principal Consultor
// router.get('/consultor', checkLogin, consultorLogueado, consultorController.index)
router.get('/empresas-asignadas', checkLogin, consultorController.empresasAsignadas)

// PROPUESTAS PARA LA EMPRESA (ANÁLISIS DE NEGOCIO & PLAN EMPRESARIAL)
const rutaAlmacen = multer.diskStorage({
    destination: function (req, file, callback) {
        const ruta = path.join(__dirname, '../public/propuestas_empresa')
        callback(null, ruta);
    },

    filename: function (req, file, callback) {
        urlPropuestaNegocio = "Propuesta-Técnica-Etapa2-" + file.originalname;
        console.log(urlPropuestaNegocio)
        callback(null, urlPropuestaNegocio)
    }

});
const subirArchivo = multer({ storage: rutaAlmacen })
router.post('/enviar-propuesta-empresa', checkLogin, subirArchivo.single('filePropuesta'), consultorController.enviarPropuesta)
// router.post('/enviar-propuesta-empresarial', checkLogin, consultorLogueado, subirArchivo.single('filePropuesta'), consultorController.enviarPropuesta)

// Cuestionario Análisis dimensión Producto 
router.get('/analisis-dimension-producto/:codigo', checkLogin, consultorController.analisisProducto)
router.post('/analisis-dimension-producto',checkLogin, consultorController.guardarAnalisisProducto)

// Cuestionario Análisis dimensión Administración 
router.get('/analisis-dimension-administracion/:codigo', checkLogin, consultorController.analisisAdministracion)
router.post('/analisis-dimension-administracion', checkLogin, consultorController.guardarAnalisisAdministracion)

// Cuestionario Análisis dimensión Operación 
router.get('/analisis-dimension-operaciones/:codigo', checkLogin, consultorController.analisisOperacion)
router.post('/analisis-dimension-operaciones', checkLogin, consultorController.guardarAnalisisOperacion)

// Cuestionario Análisis dimensión Marketing  
router.get('/analisis-dimension-marketing/:codigo', checkLogin, consultorController.analisisMarketing)
router.post('/analisis-dimension-marketing', checkLogin, consultorController.guardarAnalisisMarketing)

/********************************************************************************/
// Etapa 3 - Plan Estratégico de Negocio
/********************************************************************************/
// Nuevas Tareas
router.post('/agregarTarea', checkLogin, consultorController.agregarTarea)
router.post('/editarTarea', checkLogin, consultorController.editarTarea)
router.post('/actualizarTarea', checkLogin, consultorController.actualizarTarea)
router.post('/eliminarTarea', checkLogin, consultorController.eliminarTarea)
router.post('/nuevoRendimiento', checkLogin, consultorController.nuevoRendimiento)
router.post('/comentarioTareas', checkLogin, consultorController.comentarioTareas)

/********************************************************************************/
// SOLICITAR ARCHIVOS (ETAPA 2, 3 Y 4)
router.post('/solicitar-archivos-empresa', checkLogin, consultorController.solicitarArchivo)
/********************************************************************************/

module.exports = router