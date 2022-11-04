const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const consultorController = require('../controllers/consultorController');
const { checkLogin, consultorLogueado } = require('../lib/auth')

// Dashboard Principal Consultor
router.get('/consultor', checkLogin, consultorLogueado, consultorController.index)
router.get('/empresas-asignadas', checkLogin, consultorLogueado, consultorController.empresasAsignadas)

// PROPUESTA DE ANÁLISIS DE NEGOCIO
const rutaAlmacen = multer.diskStorage({
    destination: function (req, file, callback) {
        const ruta = path.join(__dirname, '../public/propuestas_analisis')
        callback(null, ruta);
    },

    filename: function (req, file, callback) {
        urlPropuestaNegocio = "Propuesta-Técnica-Etapa2-" + file.originalname;
        console.log(urlPropuestaNegocio)
        callback(null, urlPropuestaNegocio)
    }

});
const subirArchivo = multer({ storage: rutaAlmacen })
router.post('/enviar-propuesta-analisis', checkLogin, consultorLogueado, subirArchivo.single('filePropuesta'), consultorController.enviarPropuesta)

// Cuestionario Análisis dimensión Producto 
router.get('/analisis-dimension-producto/:codigo', checkLogin, consultorLogueado, consultorController.analisisProducto)
router.post('/analisis-dimension-producto',checkLogin, consultorLogueado, consultorController.guardarAnalisisProducto)

// Cuestionario Análisis dimensión Administración 
router.get('/analisis-dimension-administracion/:codigo', checkLogin, consultorLogueado, consultorController.analisisAdministracion)
router.post('/analisis-dimension-administracion', checkLogin, consultorLogueado, consultorController.guardarAnalisisAdministracion)

// Cuestionario Análisis dimensión Operación 
router.get('/analisis-dimension-operaciones/:codigo', checkLogin, consultorLogueado, consultorController.analisisOperacion)
router.post('/analisis-dimension-operaciones', checkLogin, consultorLogueado, consultorController.guardarAnalisisOperacion)

// Cuestionario Análisis dimensión Marketing  
router.get('/analisis-dimension-marketing/:codigo', checkLogin, consultorLogueado, consultorController.analisisMarketing)
router.post('/analisis-dimension-marketing', checkLogin, consultorLogueado, consultorController.guardarAnalisisMarketing)

/********************************************************************************/
// Etapa 3 - Plan Estratégico de Negocio
/********************************************************************************/
// Nuevas Tareas
router.post('/agregarTarea', checkLogin, consultorLogueado, consultorController.agregarTarea)
router.post('/editarTarea', checkLogin, consultorController.editarTarea)
router.post('/actualizarTarea', checkLogin, consultorLogueado, consultorController.actualizarTarea)
router.post('/eliminarTarea', checkLogin, consultorLogueado, consultorController.eliminarTarea)
router.post('/nuevoRendimiento', checkLogin, consultorLogueado, consultorController.nuevoRendimiento)

module.exports = router