const consultorController = exports;
const pool = require('../database')
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// Dashboard Administrativo
consultorController.index = async (req, res) => {
    const con = await pool.query('SELECT * FROM consultores WHERE codigo = ? LIMIT 1', [req.user.codigo])

    const empresas = await pool.query('SELECT * FROM empresas WHERE consultor = ? ORDER BY id_empresas DESC LIMIT 2', [con[0].id_consultores])
    
    res.render('consultor/panelConsultor', { consultorDash: true, itemActivo: 1, empresas, graficas1: true });
}

// EMPRESAS
consultorController.empresasAsignadas = async (req, res) => {
    
    const con = await pool.query('SELECT * FROM consultores WHERE codigo = ? LIMIT 1', [req.user.codigo])

    let empresas = await pool.query('SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.id_empresa, p.diagnostico_negocio, p.analisis_negocio, a.id_empresa, a.estadoAcuerdo, d.id_diagnostico, d.id_empresa FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa" AND e.consultor = ? LEFT OUTER JOIN dg_empresa_establecida d ON d.id_empresa = e.id_empresas;', [con[0].id_consultores])

    const informe = await pool.query('SELECT * FROM informes')

    empresas.forEach(e => {
        e.etapa = 'Email sin confirmar';
        e.estadoEmail == 1 ? e.etapa = 'Email confirmado' : e.etapa = e.etapa;
        e.diagnostico_negocio == 1 ? e.etapa = 'Diagnóstico pagado' : e.etapa = e.etapa;
        e.analisis_negocio == 1 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;
        e.estadoAcuerdo == 2 ? e.etapa = 'Acuerdo firmado' : e.etapa = e.etapa;
        e.telefono ? e.etapa = 'Ficha cliente' : e.etapa = e.etapa;
        e.id_diagnostico ? e.etapa = 'Cuestionario diagnóstico' : e.etapa = e.etapa;

        informe.forEach(i => {
            if (i.id_empresa == e.id_empresas){
                e.etapa = 'Informe diagnóstico';
            }
        })

    });

    res.render('consultor/empresas', { consultorDash: true, itemActivo: 2, empresas })
}

consultorController.empresaInterna = async (req, res) => {
    const codigo = req.params.codigo, datos = {};
    let consultores = null, c1, c2;
    const con = await pool.query('SELECT * FROM consultores WHERE codigo = ? LIMIT 1', [req.user.codigo])
    const idConsultor = con[0].id_consultores
    let userEmpresa = await pool.query('SELECT * FROM users WHERE codigo = ? AND rol = "Empresa" LIMIT 1', [codigo])

    // Empresa tabla Usuarios
    let filas = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigo])
    filas = filas[0];
    const idUser = filas.id_empresas;
    // Empresa tabla Ficha Cliente
    let empresa = await pool.query('SELECT * FROM ficha_cliente WHERE id_empresa = ? LIMIT 1', [idUser])

    datos.nombre_completo = filas.nombres + " " + filas.apellidos;
    datos.nombre_empresa = filas.nombre_empresa;
    datos.email = filas.email;
    datos.estadoAdm = userEmpresa[0].estadoAdm;
    datos.code = codigo;


    if (filas) {
        filas.estadoEmail == 1 ? datos.etapa = 'Email confirmado' : datos.etapa = datos.etapa;
        c1 = await pool.query('SELECT * FROM pagos WHERE id_empresa = ? LIMIT 1', [idUser])
        c2 = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_empresa = ? LIMIT 1', [idUser])
        filas.consultor != null ? datos.etapa = 'Consultor asignado' : datos.etapa = datos.etapa;
    }

    if (c1.length > 0) {
        c1[0].diagnostico_negocio == 1 ? datos.etapa = 'Diagnóstico pagado' : datos.etapa = datos.etapa;
        c1[0].analisis_negocio == 1 ? datos.etapa = 'Análisis pagado' : datos.etapa = datos.etapa;
    }
    if (c2.length > 0) {
        c2[0].estadoAcuerdo == 2 ? datos.etapa = 'Acuerdo firmado' : datos.etapa = datos.etapa;
    }

    if (empresa.length > 0) {
        empresa = empresa[0]
        empresa.telefono != null ? datos.etapa = 'Ficha Cliente' : datos.etapa = datos.etapa;

        const fNac = new Date(empresa.fecha_nacimiento)
        empresa.fecha_nacimiento = fNac.toLocaleDateString("en-US")

        if (empresa.redes_sociales) {
            datos.redes = JSON.parse(empresa.redes_sociales)
            datos.redes.twitter != '' ? datos.redes.twitter = datos.redes.twitter : datos.redes.twitter = false
            datos.redes.facebook != '' ? datos.redes.facebook = datos.redes.facebook : datos.redes.facebook = false
            datos.redes.instagram != '' ? datos.redes.instagram = datos.redes.instagram : datos.redes.instagram = false
            datos.redes.otra != '' ? datos.redes.otra = datos.redes.otra : datos.redes.otra = false
        }

        datos.objetivos = JSON.parse(empresa.objetivos)
        datos.fortalezas = JSON.parse(empresa.fortalezas)
        datos.problemas = JSON.parse(empresa.problemas)

    }

    // Tabla de Diagnóstico - Empresas Nuevas & Establecidas
    const frmDiag = {}
    let diagnostico = await pool.query('SELECT * FROM dg_empresa_establecida WHERE id_empresa = ? AND id_consultor = ?', [idUser, idConsultor])
    let dgNuevasEmpresas = await pool.query('SELECT * FROM dg_empresa_nueva WHERE id_empresa = ? AND id_consultor = ?', [idUser, idConsultor])

    if (diagnostico.length == 0 && dgNuevasEmpresas.length == 0){
        frmDiag.color = 'badge-danger'
        frmDiag.texto = 'Pendiente'
        frmDiag.fechaLocal = true;
        frmDiag.tablasVacias = true;
    } else {
        datos.etapa = 'Cuestionario diagnóstico'
        frmDiag.color = 'badge-success'
        frmDiag.estilo = 'linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%); color: #FFFF'
        frmDiag.texto = 'Completado'
        frmDiag.estado = true;
        
        if (diagnostico.length > 0) {
            frmDiag.fecha = diagnostico[0].fecha;
            frmDiag.tabla1 = true;
            frmDiag.tabla2 = false;
        }else{
            frmDiag.fecha = dgNuevasEmpresas[0].fecha;
            frmDiag.tabla1 = false;
            frmDiag.tabla2 = true;
        }
        
    }

    // Respuestas del Cuestionario Diagnóstico Empresa Establecida
    const resDiag = {}
    if (frmDiag.tabla1) {
        const r = diagnostico[0]
        resDiag.producto = JSON.parse(r.productos_servicios)
        resDiag.administracion = JSON.parse(r.administracion)
        resDiag.talento = JSON.parse(r.talento_humano)
        resDiag.finanzas = JSON.parse(r.finanzas)
        resDiag.servicio = JSON.parse(r.servicio_alcliente)
        resDiag.operaciones = JSON.parse(r.operaciones)
        resDiag.ambiente = JSON.parse(r.ambiente_laboral)
        resDiag.innovacion = JSON.parse(r.innovacion)
        resDiag.marketing = JSON.parse(r.marketing)
        resDiag.ventas = JSON.parse(r.ventas)
        resDiag.fortalezas = JSON.parse(r.fortalezas)
        resDiag.oportunidades = JSON.parse(r.oportunidades_mejoras)
        resDiag.metas = JSON.parse(r.metas_corto_plazo)
    }
    // Respuestas del Cuestionario Diagnóstico Empresa Nueva
    if (frmDiag.tabla2) {
        console.log("Info para Diagnóstico empresa nueva")
        const r = dgNuevasEmpresas[0]
        resDiag.rubro = r.rubro
        resDiag.exp_rubro = JSON.parse(r.exp_rubro)
        resDiag.mentalidad = JSON.parse(r.mentalidad_empresarial)
        resDiag.viabilidad = JSON.parse(r.viabilidad)
        resDiag.producto = JSON.parse(r.productos_servicios)
        resDiag.administracion = JSON.parse(r.administracion)
        resDiag.talento = JSON.parse(r.talento_humano)
        resDiag.finanzas = JSON.parse(r.finanzas)
        resDiag.servicio = JSON.parse(r.servicio_cliente)
        resDiag.operaciones = JSON.parse(r.operaciones)
        resDiag.ambiente = JSON.parse(r.ambiente_laboral)
        resDiag.innovacion = JSON.parse(r.innovacion)
        resDiag.marketing = JSON.parse(r.marketing)
        resDiag.ventas = JSON.parse(r.ventas)
        resDiag.metas = JSON.parse(r.metas)
    }
    

    // Tabla de Informes
    const frmInfo = {}
    let informes = await pool.query('SELECT * FROM informes WHERE id_empresa = ? AND id_consultor = ? ORDER BY id_informes DESC', [idUser, idConsultor])
    if (informes.length > 0){
        frmInfo.fecha = informes[0].fecha;
        frmInfo.ver1 = 'block';
        frmInfo.ver2 = 'none';
        frmInfo.url = informes[0].url;
        datos.etapa = 'Informe diagnóstico'
    } else{
        frmInfo.ver1 = 'none';
        frmInfo.ver2 = 'block';
        frmInfo.url = '#'
    }

    /************** DATOS PARA LAS GRÁFICAS AREAS VITALES & POR DIMENSIONES ****************/
    let jsonDimensiones, jsonDimensiones1 = null, jsonDimensiones2 = null, nuevosProyectos = 0, rendimiento = {};
    let jsonAnalisis1 = null, jsonAnalisis2 = null;
    
    let areasVitales = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ ASC LIMIT 1', [idUser])
    let areasVitales2 = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ DESC LIMIT 1', [idUser])
    if (areasVitales.length > 0) {
        jsonAnalisis1 = JSON.stringify(areasVitales[0]);
        jsonAnalisis2 = JSON.stringify( areasVitales2[0])
        if (areasVitales[0].rendimiento_op >= 1){
            rendimiento.op = areasVitales[0].rendimiento_op
        } else {
            rendimiento.op = false;
        }
    }


    let resulCateg = await pool.query('SELECT * FROM resultado_categorias WHERE id_empresa = ? LIMIT 1', [idUser])
    if (resulCateg.length > 0) {
        jsonDimensiones1 = JSON.stringify(resulCateg[0]);
        nuevosProyectos = 1;
        // Rendimiento del Proyecto
        rendimiento.num = resulCateg[0].rendimiento
        if (rendimiento.num < 50){
            rendimiento.txt = "Mejorable"
            rendimiento.color = "badge-danger"
        } else if (rendimiento.num > 51 && rendimiento.num < 74) {
            rendimiento.txt = "Satisfactorio"
            rendimiento.color = "badge-warning"
        } else {
            rendimiento.txt = "Óptimo"
            rendimiento.color = "badge-success"
        }
    }

    let xDimensiones = await pool.query('SELECT * FROM indicadores_dimensiones WHERE id_empresa = ? ORDER BY id ASC LIMIT 1', [idUser])
    let xDimensiones2 = await pool.query('SELECT * FROM indicadores_dimensiones WHERE id_empresa = ? ORDER BY id DESC LIMIT 1', [idUser])
    if (xDimensiones.length > 0) {
        jsonDimensiones1 = JSON.stringify(xDimensiones[0]);
        jsonDimensiones2 = JSON.stringify( xDimensiones2[0]);
        nuevosProyectos = 0;
    }

    jsonDimensiones = jsonDimensiones1

    /************************************************************************************* */

    res.render('consultor/empresaInterna', { 
        consultorDash: true, itemActivo: 2, empresa, formEdit: true, datos, consultores, frmDiag, frmInfo,
        jsonAnalisis1, jsonAnalisis2, jsonDimensiones, jsonDimensiones2, resDiag, nuevosProyectos, rendimiento,
        graficas2: true
    })

}

consultorController.analisisProducto = async (req, res) => {
    const { codigo } = req.params;
    let volver = '/empresas/'
    if (req.user.rol == 'Consultor') {
        volver = '/empresas-asignadas/'+codigo;
    }
    res.render('consultor/analisisProducto', { wizarx: true, user_dash: false, adminDash: false, codigo, volver })
}

consultorController.guardarAnalisisProducto = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", {timeZone: zhActualAdm})

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await pool.query('SELECT * FROM empresas')
    const analisis_empresa = await pool.query('SELECT * FROM analisis_empresa');

    empresa = empresa.find(item => item.codigo == codigoEmpresa)
   
    let id_empresa, id_consultor;

    // Consultor que realizó el análisis
    const consultores = await pool.query('SELECT * FROM consultores');
    const c = consultores.find(item => item.codigo == req.user.codigo)
    c ? id_consultor = c.id_consultores : id_consultor = 0; 

    if (empresa) {
        id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Analisis dimensión Producto
        const { publico_objetivo, beneficios, tipo_producto, nivel_precio, mas_vendidos, razon_venta, utilizacion, integracion_gama, calidad, aceptacion } = req.body
        let producto = JSON.stringify({
            fecha, publico_objetivo, beneficios, tipo_producto, nivel_precio, mas_vendidos, razon_venta, utilizacion, integracion_gama, calidad, aceptacion
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { producto }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, id_consultor, producto }
            await pool.query('INSERT INTO analisis_empresa SET ?', [nuevoAnalisis])
        }

        if (req.user.rol == 'Consultor'){
            res.redirect('/empresas-asignadas/'+codigoEmpresa)
        } else {
            res.redirect('/empresas/'+codigoEmpresa)
        }

    }

    
}

consultorController.analisisAdministracion = async (req, res) => {
    const { codigo } = req.params;
    let volver = '/empresas/'
    if (req.user.rol == 'Consultor') {
        volver = '/empresas-asignadas/'+codigo;
    }
    res.render('consultor/analisisAdministracion', { wizarx: true, user_dash: false, adminDash: false, codigo, volver })
}

consultorController.guardarAnalisisAdministracion = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", {timeZone: zhActualAdm})

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await pool.query('SELECT * FROM empresas')
    const analisis_empresa = await pool.query('SELECT * FROM analisis_empresa');

    empresa = empresa.find(item => item.codigo == codigoEmpresa)
   
    let id_consultor;

    // Consultor que realizó el análisis
    const consultores = await pool.query('SELECT * FROM consultores');
    const c = consultores.find(item => item.codigo == req.user.codigo)
    c ? id_consultor = c.id_consultores : id_consultor = false; 

    if (empresa && id_consultor) {
        let id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Analisis dimensión Producto
        const { vision1, vision2, vision3, vision4, vision5, mision, valores, foda1, foda2, foda3, foda4, foda5, foda6, foda7, foda8, estructura_organizativa, tipo_sistema, sistema_facturacion, puesto1, funcion1, puesto2, funcion2, puesto3, funcion3, puesto4, funcion4, puesto5, funcion5, puesto6, funcion6, h_puesto1, habilidad_interp1, habilidad_tecnica1, h_puesto2, habilidad_interp2, habilidad_tecnica2, h_puesto3, habilidad_interp3, habilidad_tecnica3, h_puesto4, habilidad_interp4, habilidad_tecnica4, h_puesto5, habilidad_interp5, habilidad_tecnica5, h_puesto6, habilidad_interp6, habilidad_tecnica6, habilidad1, habilidad2, necesidad_contratacion, motivo_contratacion, proceso_contratacion1, proceso_contratacion2, evaluacion_cargo, proyeccion_ventas, costo_ventas, cuentas_pagar, cuentas_cobrar, costos_fijos_variables, estado_resultados_empresa, utilidad_neta, rentabilidad, punto_equilibrio, flujo_caja, retorno_inversion} = req.body

        const vision = { vision1, vision2, vision3, vision4, vision5 };
        const foda = { foda1, foda2, foda3, foda4, foda5, foda6, foda7, foda8 }
        const av_talento_humano = { puesto1, funcion1, puesto2, funcion2, puesto3, funcion3, puesto4, funcion4, puesto5, funcion5, puesto6, funcion6,
            h_puesto1, habilidad_interp1, habilidad_tecnica1, h_puesto2, habilidad_interp2, habilidad_tecnica2, h_puesto3, habilidad_interp3, habilidad_tecnica3, h_puesto4, habilidad_interp4, habilidad_tecnica4, h_puesto5, habilidad_interp5, habilidad_tecnica5, h_puesto6, habilidad_interp6, habilidad_tecnica6, habilidad1, habilidad2, necesidad_contratacion, motivo_contratacion, proceso_contratacion1, proceso_contratacion2, evaluacion_cargo }
        const av_finanzas = { proyeccion_ventas, costo_ventas, cuentas_pagar, cuentas_cobrar, costos_fijos_variables, estado_resultados_empresa, utilidad_neta, rentabilidad, punto_equilibrio, flujo_caja, retorno_inversion }

        let administracion = JSON.stringify({
            fecha, vision, mision, valores, foda, estructura_organizativa, tipo_sistema, sistema_facturacion, av_talento_humano, av_finanzas
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { administracion }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, id_consultor, administracion }
            await pool.query('INSERT INTO analisis_empresa SET ?', [nuevoAnalisis])
        }

        if (req.user.rol == 'Consultor'){
            res.redirect('/empresas-asignadas/'+codigoEmpresa)
        } else {
            res.redirect('/empresas/'+codigoEmpresa)
        }

    }
}