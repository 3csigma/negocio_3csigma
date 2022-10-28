const consultorController = exports;
const pool = require('../database')
const { etapaFinalizadaHTML, sendEmail, tareaCompletadaHTML, tareaNuevaHTML } = require('../lib/mail.config')
const { consultarInformes, consultarTareas, consultarDatos } = require('../lib/helpers')

// Dashboard Administrativo
consultorController.index = async (req, res) => {
    const { codigo } = req.user
    const consultores = await consultarDatos('consultores')
    const consultor = consultores.find(x => x.codigo == codigo)
    const empresas = await consultarDatos('empresas', `WHERE consultor = ${consultor.id_consultores} ORDER BY id_empresas DESC LIMIT 2`)
    // const empresas = await pool.query('SELECT * FROM empresas WHERE consultor = ? ORDER BY id_empresas DESC LIMIT 2', [con[0].id_consultores])

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE EMPRESAS ASIGANADAS MENSUALMENTE <<====
    let empresas_asignadas = await pool.query("SELECT * FROM (SELECT * FROM historial_empresas_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);
    let datosJson_empresas_asignadas
    if (empresas_asignadas.length > 0) { datosJson_empresas_asignadas = JSON.stringify(empresas_asignadas) }
    // FIN DE LA FUNCIÓN <<====

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE INFORMES REGISTRADOS MENSUALMENTE <<====
    let historialInformes = await pool.query("SELECT * FROM (SELECT * FROM historial_informes_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);
    let datosJson_historialI_consultor
    if (historialInformes.length > 0) { datosJson_historialI_consultor = JSON.stringify(historialInformes) }
    // FIN DE LA FUNCIÓN <<====

    // Informe de diagnóstico de empresa subido
    let ultimosInformes = await consultarDatos('informes', 'ORDER BY id_informes DESC LIMIT 2')
    ultimosInformes = ultimosInformes.filter(x => x.id_consultor == consultor.id_consultores)
    if (ultimosInformes.length > 0) {
        ultimosInformes.forEach(x => {
            if (x.nombre == 'Informe diagnóstico') {
                x.etapa = 'Diagnóstico'
            }
            if (x.nombre == 'Informe de dimensión producto' || x.nombre == 'Informe de dimensión administración' || x.nombre == 'Informe de dimensión operaciones' || x.nombre == 'Informe de dimensión marketing' || x.nombre == 'Informe de análisis') { x.etapa = 'Análisis' }
            if (x.nombre == 'Informe de plan estratégico') { x.etapa = 'Plan estratégico' }
        })
    }

    res.render('consultor/panelConsultor', {
        consultorDash: true, itemActivo: 1, empresas, graficas1: true, 
        datosJson_empresas_asignadas, datosJson_historialI_consultor,
        ultimosInformes
    });
}

// EMPRESAS
consultorController.empresasAsignadas = async (req, res) => {

    const con = await pool.query('SELECT * FROM consultores WHERE codigo = ? LIMIT 1', [req.user.codigo])

    let empresas = await pool.query('SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.id_empresa, p.diagnostico_negocio, p.analisis_negocio, a.id_empresa, a.estadoAcuerdo, d.consecutivo, d.id_empresa FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa" AND e.consultor = ? LEFT OUTER JOIN dg_empresa_establecida d ON d.id_empresa = e.id_empresas;', [con[0].id_consultores])

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
            if (i.id_empresa == e.id_empresas) {
                e.etapa = 'Informe diagnóstico';
            }
        })

    });

    res.render('consultor/empresas', { consultorDash: true, itemActivo: 2, empresas })
}

consultorController.empresaInterna = async (req, res) => {
    const codigo = req.params.codigo, datos = {};
    console.log(codigo)
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
    datos.idEmpresa = idUser


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
            datos.redesOK = false;
            datos.redes = JSON.parse(empresa.redes_sociales)
            datos.redes.twitter != '' ? datos.redes.twitter = datos.redes.twitter : datos.redes.twitter = false
            datos.redes.facebook != '' ? datos.redes.facebook = datos.redes.facebook : datos.redes.facebook = false
            datos.redes.instagram != '' ? datos.redes.instagram = datos.redes.instagram : datos.redes.instagram = false
            datos.redes.otra != '' ? datos.redes.otra = datos.redes.otra : datos.redes.otra = false

            if (datos.redes.twitter || datos.redes.facebook || datos.redes.instagram || datos.redes.otra) {
                datos.redesOK = true;
            }
        }

        datos.objetivos = JSON.parse(empresa.objetivos)
        datos.fortalezas = JSON.parse(empresa.fortalezas)
        datos.problemas = JSON.parse(empresa.problemas)

    }

    // Tabla de Diagnóstico - Empresas Nuevas & Establecidas
    const frmDiag = {}
    let diagnostico = await pool.query('SELECT * FROM dg_empresa_establecida WHERE id_empresa = ? AND id_consultor = ?', [idUser, idConsultor])
    let dgNuevasEmpresas = await pool.query('SELECT * FROM dg_empresa_nueva WHERE id_empresa = ? AND id_consultor = ?', [idUser, idConsultor])

    if (diagnostico.length == 0 && dgNuevasEmpresas.length == 0) {
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
        } else {
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


    /***************** Tabla de Informes ******************* */
    const frmInfo = {};
    const info = {
        prod: { ver: 'none' },
        adm: { ver: 'none' },
        op: { ver: 'none' },
        marketing: { ver: 'none' },
        analisis: { ver: 'none' }
    }
    let tablaInformes = await pool.query('SELECT * FROM informes WHERE id_empresa = ? AND id_consultor = ? ORDER BY id_informes DESC', [idUser, idConsultor])
    if (tablaInformes.length > 0) {
        frmInfo.fecha = tablaInformes[0].fecha;
        frmInfo.ver1 = 'block';
        frmInfo.ver2 = 'none';
        frmInfo.url = tablaInformes[0].url;
        datos.etapa = 'Informe diagnóstico'
    } else {
        frmInfo.ver1 = 'none';
        frmInfo.ver2 = 'block';
        frmInfo.url = '#'
    }

    // Informe de diagnóstico
    const informeDiag = await consultarInformes(idUser, "Informe diagnóstico")
    // Informe de dimensión producto
    const informeProd = await consultarInformes(idUser, "Informe de dimensión producto")
    // Informe de dimensión administración
    const informeAdmin = await consultarInformes(idUser, "Informe de dimensión administración")
    // Informe de dimensión operaciones
    const informeOperaciones = await consultarInformes(idUser, "Informe de dimensión operaciones")
    // Informe de dimensión marketing
    const informeMarketing = await consultarInformes(idUser, "Informe de dimensión marketing")
    // Informe de análisis
    const informeAnalisis = await consultarInformes(idUser, "Informe de análisis")

    if (informeDiag) {
        frmInfo.fecha = informeDiag.fecha;
        frmInfo.ver1 = 'block';
        frmInfo.ver2 = 'none';
        frmInfo.url = informeDiag.url;
        datos.etapa = 'Informe diagnóstico general'
    }

    if (informeProd) {
        info.prod.fecha = informeProd.fecha;
        info.prod.ver = 'block';
        info.prod.url = informeProd.url;
        datos.etapa = 'Informe análisis dimensión producto'
    }

    if (informeAdmin) {
        info.adm.fecha = informeAdmin.fecha;
        info.adm.ver = 'block';
        info.adm.url = informeAdmin.url;
        datos.etapa = 'Informe análisis dimensión administración'
    }

    if (informeOperaciones) {
        info.op.fecha = informeOperaciones.fecha;
        info.op.ver = 'block';
        info.op.url = informeOperaciones.url;
        datos.etapa = 'Informe análisis dimensión operaciones'
    }

    if (informeMarketing) {
        info.marketing.fecha = informeMarketing.fecha;
        info.marketing.ver = 'block';
        info.marketing.url = informeMarketing.url;
        datos.etapa = 'Informe análisis dimensión marketing'
    }

    if (informeAnalisis) {
        info.analisis.fecha = informeAnalisis.fecha;
        info.analisis.ver = 'block';
        info.analisis.url = informeAnalisis.url;
        datos.etapa = 'Informe análisis general'
    }

    /************** DATOS PARA LAS GRÁFICAS DE DIAGNÓSTICO - ÁREAS VITALES & POR DIMENSIONES ****************/
    let jsonDimensiones1 = null, jsonDimensiones2 = null, nuevosProyectos = 0, rendimiento = {};
    let jsonAnalisis1 = null, jsonAnalisis2 = null;

    let areasVitales = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ ASC LIMIT 1', [idUser])
    let areasVitales2 = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ DESC LIMIT 1', [idUser])
    if (areasVitales.length > 0) {
        jsonAnalisis1 = JSON.stringify(areasVitales[0]);
        jsonAnalisis2 = JSON.stringify(areasVitales2[0])
        if (areasVitales[0].rendimiento_op >= 1) {
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
        if (rendimiento.num < 50) {
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
        jsonDimensiones2 = JSON.stringify(xDimensiones2[0]);
        nuevosProyectos = 0;
    }

    /************************************************************************************* */
    /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
    const propuestas = await consultarDatos('propuesta_analisis')
    const propuesta = propuestas.find(i => i.empresa == idUser)
    let pagos_analisis = { ok: false };
    if (propuesta) {
        datos.etapa = 'Propuesta de análisis enviada'
        const pagos = await consultarDatos('pagos')

        /** PAGOS DE ANÁLISIS DE NEGOCIO (ÚNICO o DIVIDIDO*/
        const pay = pagos.find(i => i.id_empresa == idUser)
        pagos_analisis.unico = JSON.parse(pay.analisis_negocio)
        pagos_analisis.uno = JSON.parse(pay.analisis_negocio1)
        pagos_analisis.dos = JSON.parse(pay.analisis_negocio2)
        pagos_analisis.tres = JSON.parse(pay.analisis_negocio3)
        pagos_analisis.unico.precio = propuesta.precio_total
        pagos_analisis.uno.precio = propuesta.precio_per1
        pagos_analisis.dos.precio = propuesta.precio_per2
        pagos_analisis.tres.precio = propuesta.precio_per3

        if (pagos_analisis.unico.estado == 1) {
            datos.etapa = 'Análisis de negocio pago único'
            propuesta.pago = true;
            pagos_analisis.ok = true;
        }
        if (pagos_analisis.uno.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 60%'
            pagos_analisis.uno.color = 'success'
            pagos_analisis.uno.txt = 'Pagado 60%'
            pagos_analisis.ok = true;
            propuesta.pago = true;
        } else {
            pagos_analisis.uno.color = 'warning'
            pagos_analisis.uno.txt = 'Pendiente'
        }
        if (pagos_analisis.dos.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 80%'
            pagos_analisis.dos.color = 'success'
            pagos_analisis.dos.txt = 'Pagado 80%'
        } else {
            pagos_analisis.dos.color = 'warning'
            pagos_analisis.dos.txt = 'Pendiente'
        }
        if (pagos_analisis.tres.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 100%'
            pagos_analisis.tres.color = 'success'
            pagos_analisis.tres.txt = 'Pagado 100%'
        } else {
            pagos_analisis.tres.color = 'warning'
            pagos_analisis.tres.txt = 'Pendiente'
        }

    }

    /************************************************************************************* */
    // ARCHIVOS CARGADOS
    let archivos = false;
    let analisis = await pool.query('SELECT * FROM analisis_empresa')
    analisis = analisis.find(i => i.id_empresa == idUser)
    if (analisis) {
        if (analisis.archivos) {
            archivos = JSON.parse(analisis.archivos)
        }
    }

    /************************************************************************************* */
    /** ANÁLISIS DE NEGOCIO POR DIMENSIONES - RESPUESTAS DE CUESTIONARIOS */
    let dimProducto = false, dimAdmin = false, dimOperacion = false, dimMarketing = false;
    const analisisDimensiones = await pool.query('SELECT * FROM analisis_empresa WHERE id_empresa = ? LIMIT 1', [idUser])
    if (analisisDimensiones.length > 0) {
        const dimension = analisisDimensiones[0]
        if (dimension.producto) {
            const prod = JSON.parse(dimension.producto)
            dimProducto = {
                fecha: prod.fecha,
                publico_objetivo: prod.publico_objetivo,
                beneficios: prod.beneficios,
                tipo_producto: prod.tipo_producto,
                nivel_precio: prod.nivel_precio,
                mas_vendidos: prod.mas_vendidos,
                razon_venta: prod.razon_venta,
                integracion_gama: prod.integracion_gama,
                calidad: prod.calidad,
                aceptacion: prod.aceptacion,
            }
        }
        if (dimension.administracion) {
            const admin = JSON.parse(dimension.administracion)
            dimAdmin = {
                fecha: admin.fecha,
                v: admin.vision,
                mision: admin.mision,
                valores: admin.valores,
                f: admin.foda,
                estructura_organizativa: admin.estructura_organizativa,
                tipo_sistema: admin.tipo_sistema,
                sistema_facturacion: admin.sistema_facturacion,
                av_th: admin.av_talento_humano,
                av_fz: admin.av_finanzas,
            }
        }
        if (dimension.operacion) {
            const op = JSON.parse(dimension.operacion)
            dimOperacion = {
                fecha: op.fecha,
                info_productos: op.info_productos,
                satisfaccion: op.satisfaccion,
                encuesta_clientes: op.encuesta_clientes,
                informacion_deClientes: op.informacion_deClientes,
                utilidad_libro_quejas: op.utilidad_libro_quejas,
                beneficio_libro_quejas: op.beneficio_libro_quejas,
                estrategia__libro_quejas: op.estrategia__libro_quejas,
                fidelizacion_clientes: op.fidelizacion_clientes,
                av_op: op.av_operaciones,
                av_ambiente: op.av_ambiente_laboral,
                av_innovacion: op.av_innovacion,
            }
        }
        if (dimension.marketing) {
            const mark = JSON.parse(dimension.marketing)
            dimMarketing = {
                fecha: mark.fecha,
                objetivo_principal: mark.objetivo_principal,
                cliente: mark.cliente,
                posicionamiento: mark.posicionamiento,
                beneficios: mark.beneficios,
                mensaje: mark.mensaje,
                oferta1: mark.oferta1,
                oferta2: mark.oferta2,
                seguimiento: mark.seguimiento,
                presupuesto: mark.presupuesto,
                atraccion: mark.atraccion,
                fidelizacion: mark.fidelizacion,
                sitioWeb: mark.sitioWeb,
                identidadC: mark.identidadC,
                eslogan: mark.eslogan,
                estrategias: mark.estrategias
            }
        }
    }
    let divInformes = false; 
    const filaInforme = { producto: false, administracion: false, operaciones: false, marketing: false }
    if (dimProducto || dimAdmin || dimOperacion || dimMarketing) { 
        divInformes = true;
        if (dimProducto) filaInforme.producto = true;
        if (dimAdmin) filaInforme.administracion = true;
        if (dimOperacion) filaInforme.operaciones = true;
        if (dimMarketing) filaInforme.marketing = true;
        if (dimProducto && dimAdmin && dimOperacion && dimMarketing) filaInforme.completo = true; 
    }
    /* --------------------------------------------------------------------------------------- */

    /************************************************************************************* */
    // PLAN ESTRATÉGICO DE NEGOCIO
    const fechaActual = new Date().toLocaleDateString('fr-CA');
    const tareas = await consultarTareas(idUser, fechaActual)

    let dim1 = tareas.todas.filter(i => i.dimension == 'Producto');
    let dim2 = tareas.todas.filter(i => i.dimension == 'Administración');
    let dim3 = tareas.todas.filter(i => i.dimension == 'Operaciones');
    let dim4 = tareas.todas.filter(i => i.dimension == 'Marketing');
    const estado1 = dim1.filter(x => x.estado == 'Completada');
    const estado2 = dim2.filter(x => x.estado == 'Completada');
    const estado3 = dim3.filter(x => x.estado == 'Completada');
    const estado4 = dim4.filter(x => x.estado == 'Completada');
    dim1 = dim1.length; dim2 = dim2.length; dim3 = dim3.length; dim4 = dim4.length;
    const listo = [
        (estado1.length * 100) / dim1, (estado2.length * 100) / dim2, (estado3.length * 100) / dim3, (estado4.length * 100) / dim4
    ]
    const jsonDim = JSON.stringify([
        { ok: Math.round(listo[0]), pendiente: Math.round(100 - listo[0]) },
        { ok: Math.round(listo[1]), pendiente: Math.round(100 - listo[1]) },
        { ok: Math.round(listo[2]), pendiente: Math.round(100 - listo[2]) },
        { ok: Math.round(listo[3]), pendiente: Math.round(100 - listo[3]) }
    ])

    let datosTabla = await consultarDatos('rendimiento_empresa')
    datosTabla = datosTabla.filter(x => x.empresa == idUser)
    const jsonRendimiento = JSON.stringify(datosTabla)

    //res.render('consultor/empresaInterna', { 
    res.render('admin/editarEmpresa', {
        consultorDash: true, itemActivo: 2, empresa, formEdit: true, datos, consultores, frmDiag, frmInfo,
        jsonAnalisis1, jsonAnalisis2, jsonDimensiones1, jsonDimensiones2, resDiag, nuevosProyectos, rendimiento,
        graficas2: true, propuesta, pagos_analisis, archivos, divInformes, filaInforme,
        info, dimProducto, dimAdmin, dimOperacion, dimMarketing,
        fechaActual, tareas,
        jsonDim, jsonRendimiento
    })

}

/* ------------------------------------------------------------------------------------------------ */
// PROPUESTA DE ANÁLISIS DE NEGOCIO
consultorController.enviarPropuesta = async (req, res) => {
    const { precioPropuesta, idEmpresa, codigo } = req.body
    const empresa = await pool.query('SELECT * FROM empresas WHERE codigo = ?', [codigo])
    const email = empresa[0].email
    const nombre = empresa[0].nombre_empresa
    const propuestasDB = await pool.query('SELECT * FROM propuesta_analisis');
    const fila = propuestasDB.find(i => i.empresa == idEmpresa)
    const link_propuesta = '../propuestas_analisis/' + urlPropuestaNegocio
    const fecha = new Date().toLocaleDateString("en-US")
    const precio_per1 = parseFloat(precioPropuesta) * 0.6
    const precio_per2 = parseFloat(precioPropuesta) * 0.2
    const precio_per3 = parseFloat(precioPropuesta) * 0.2
    if (fila) {
        const actualizarPropuesta = { precio_total: precioPropuesta, precio_per1, precio_per2, precio_per3, fecha, link_propuesta }
        await pool.query('UPDATE propuesta_analisis SET ? WHERE empresa = ?', [actualizarPropuesta, idEmpresa]);
    } else {
        const nuevaPropuesta = { empresa: idEmpresa, precio_total: precioPropuesta, precio_per1, precio_per2, precio_per3, fecha, link_propuesta }
        await pool.query('INSERT INTO propuesta_analisis SET ?', [nuevaPropuesta]);
    }
    /** INFO PARA ENVÍO DE EMAIL */
    const asunto = "¡Felicitaciones!, Etapa 1 finalizada"
    const etapa  = 'Diagnóstico'
    const texto = 'Tenemos una propuesta para que continúes con tu proceso en 3C Sigma'
    // Obtener la plantilla de Email
    const template = etapaFinalizadaHTML(nombre, etapa, texto, 'analisis-de-negocio');

    // Enviar Email
    const resultEmail = await sendEmail(email, asunto, template)

    if (resultEmail == false) {
        res.json("Ocurrio un error inesperado al enviar el email de Consultor Asignado")
    } else {
        console.log("\n<<<<< Email de Etapa 1 Finalizada - Enviado >>>>>\n")
    }

    let redireccionar = '/empresas/' + codigo
    if (req.user.rol == 'Consultor') {
        redireccionar = '/empresas-asignadas/' + codigo;
    }
    res.redirect(redireccionar)
}

// ANÁLISIS DIMENSIÓN PRODUCTO
consultorController.analisisProducto = async (req, res) => {
    const { codigo } = req.params;
    let volver = '/empresas/' + codigo + '#analisis_';
    if (req.user.rol == 'Consultor') {
        volver = '/empresas-asignadas/' + codigo + '#analisis_';
    }
    res.render('consultor/analisisProducto', { wizarx: true, user_dash: false, adminDash: false, codigo, volver })
}
consultorController.guardarAnalisisProducto = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

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

        if (req.user.rol == 'Consultor') {
            res.redirect('/empresas-asignadas/' + codigoEmpresa + '#analisis_')
        } else {
            res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
        }

    }


}

// ANÁLISIS DIMENSIÓN ADMINISTRACIÓN
consultorController.analisisAdministracion = async (req, res) => {
    const { codigo } = req.params;
    let volver = '/empresas/' + codigo + '#analisis_';
    if (req.user.rol == 'Consultor') {
        volver = '/empresas-asignadas/' + codigo + '#analisis_';
    }
    res.render('consultor/analisisAdministracion', { wizarx: true, user_dash: false, adminDash: false, codigo, volver })
}
consultorController.guardarAnalisisAdministracion = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

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
        const { vision1, vision2, vision3, vision4, vision5, mision, valores, foda1, foda2, foda3, foda4, foda5, foda6, foda7, foda8, estructura_organizativa, tipo_sistema, sistema_facturacion, puesto1, funcion1, puesto2, funcion2, puesto3, funcion3, puesto4, funcion4, puesto5, funcion5, puesto6, funcion6, h_puesto1, habilidad_interp1, habilidad_tecnica1, h_puesto2, habilidad_interp2, habilidad_tecnica2, h_puesto3, habilidad_interp3, habilidad_tecnica3, h_puesto4, habilidad_interp4, habilidad_tecnica4, h_puesto5, habilidad_interp5, habilidad_tecnica5, h_puesto6, habilidad_interp6, habilidad_tecnica6, habilidad1, habilidad2, necesidad_contratacion, motivo_contratacion, proceso_contratacion1, proceso_contratacion2, evaluacion_cargo, proyeccion_ventas, costo_ventas, cuentas_pagar, cuentas_cobrar, costos_fijos_variables, estado_resultados_empresa, utilidad_neta, rentabilidad, punto_equilibrio, flujo_caja, retorno_inversion } = req.body

        const vision = { vision1, vision2, vision3, vision4, vision5 };
        const foda = { foda1, foda2, foda3, foda4, foda5, foda6, foda7, foda8 }
        const av_talento_humano = {
            puesto1, funcion1, puesto2, funcion2, puesto3, funcion3, puesto4, funcion4, puesto5, funcion5, puesto6, funcion6,
            h_puesto1, habilidad_interp1, habilidad_tecnica1, h_puesto2, habilidad_interp2, habilidad_tecnica2, h_puesto3, habilidad_interp3, habilidad_tecnica3, h_puesto4, habilidad_interp4, habilidad_tecnica4, h_puesto5, habilidad_interp5, habilidad_tecnica5, h_puesto6, habilidad_interp6, habilidad_tecnica6, habilidad1, habilidad2, necesidad_contratacion, motivo_contratacion, proceso_contratacion1, proceso_contratacion2, evaluacion_cargo
        }
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

        if (req.user.rol == 'Consultor') {
            res.redirect('/empresas-asignadas/' + codigoEmpresa + '#analisis_')
        } else {
            res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
        }

    }
}

// ANÁLISIS DIMENSIÓN OPERACION
consultorController.analisisOperacion = async (req, res) => {
    const { codigo } = req.params;
    let volver = '/empresas/' + codigo + '#analisis_';
    if (req.user.rol == 'Consultor') {
        volver = '/empresas-asignadas/' + codigo + '#analisis_';
    }
    res.render('consultor/analisisOperacion', { wizarx: true, user_dash: false, adminDash: false, codigo, volver })
}
consultorController.guardarAnalisisOperacion = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await pool.query('SELECT * FROM empresas')
    const analisis_empresa = await pool.query('SELECT * FROM analisis_empresa');
    empresa = empresa.find(item => item.codigo == codigoEmpresa)

    // Consultor que realizó el análisis
    let id_consultor;
    const consultores = await pool.query('SELECT * FROM consultores');
    const c = consultores.find(item => item.codigo == req.user.codigo)
    c ? id_consultor = c.id_consultores : id_consultor = false;

    if (empresa && id_consultor) {
        let id_empresa = empresa.id_empresas;

        // Capturando datos del formulario - Analisis dimensión Producto
        const { info_productos, satisfaccion, encuesta_clientes, informacion_deClientes, utilidad_libro_quejas, beneficio_libro_quejas, estrategia__libro_quejas, fidelizacion_clientes, instalaciones_op, areas_op, influencia_op, permisos1, permisos2, plan_trabajo1, plan_trabajo2, plan_trabajo3, procesos_estandarizados1, procesos_estandarizados2, ambiente_laboral, comunicacion, reconocimiento1, reconocimiento2, innovacion_inidividual1, innovacion_inidividual2, innovacion_productos, innovacion_procesos, innovacion_modelo, innovacion_gestion } = req.body

        const av_operaciones = { instalaciones_op, areas_op, influencia_op, permisos1, permisos2, plan_trabajo1, plan_trabajo2, plan_trabajo3, procesos_estandarizados1, procesos_estandarizados2 }
        const av_ambiente_laboral = { ambiente_laboral, comunicacion, reconocimiento1, reconocimiento2 }
        const av_innovacion = { innovacion_inidividual1, innovacion_inidividual2, innovacion_productos, innovacion_procesos, innovacion_modelo, innovacion_gestion };

        const operacion = JSON.stringify({
            fecha, info_productos, satisfaccion, encuesta_clientes, informacion_deClientes, utilidad_libro_quejas, beneficio_libro_quejas, estrategia__libro_quejas, fidelizacion_clientes, av_operaciones, av_ambiente_laboral, av_innovacion
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { operacion }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, id_consultor, operacion }
            await pool.query('INSERT INTO analisis_empresa SET ?', [nuevoAnalisis])
        }

        if (req.user.rol == 'Consultor') {
            res.redirect('/empresas-asignadas/' + codigoEmpresa + '#analisis_')
        } else {
            res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
        }

    } else {
        console.log("Error no sé encontró la empresa y el consultor ligado..")
    }
}

// ANÁLISIS DIMENSIÓN MARKETING
consultorController.analisisMarketing = async (req, res) => {
    const { codigo } = req.params;
    let volver = '/empresas/' + codigo + '#analisis_';
    if (req.user.rol == 'Consultor') {
        volver = '/empresas-asignadas/' + codigo + '#analisis_';
    }
    res.render('consultor/analisisMarketing', { wizarx: true, user_dash: false, adminDash: false, codigo, volver })
}
consultorController.guardarAnalisisMarketing = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

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
        const { objetivo_principal, cliente, posicionamiento, beneficios, mensaje, oferta1, oferta2, seguimiento, presupuesto, atraccion, fidelizacion, sitioWeb1, sitioWeb2, sitioWeb3, sitioWeb4, sitioWeb5, sitioWeb6, sitioWeb7, identidadC1, identidadC2, identidadC3, identidadC4, identidadC5, identidadC6, identidadC7, eslogan, estrategia1, estrategia2, estrategia3, estrategia4, estrategia5, estrategia6 } = req.body

        const sitioWeb = { s1: sitioWeb1, s2: sitioWeb2, s3: sitioWeb3, s4: sitioWeb4, s5: sitioWeb5, s6: sitioWeb6, s7: sitioWeb7 }
        const identidadC = { ic1: identidadC1, ic2: identidadC2, ic3: identidadC3, ic4: identidadC4, ic5: identidadC5, ic6: identidadC6, ic7: identidadC7 }
        const estrategias = { e1: estrategia1, e2: estrategia2, e3: estrategia3, e4: estrategia4, e5: estrategia5, e6: estrategia6 }

        const marketing = JSON.stringify({
            fecha, objetivo_principal, cliente, posicionamiento, beneficios, mensaje, oferta1, oferta2, seguimiento, presupuesto, atraccion, fidelizacion, sitioWeb, identidadC, eslogan, estrategias
        })

        // Guardando en la Base de datos
        const tablaAnalisis = analisis_empresa.find(item => item.id_empresa == id_empresa)
        if (tablaAnalisis) {
            const actualizarAnalisis = { marketing }
            await pool.query('UPDATE analisis_empresa SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        } else {
            // Creando Objetos para guardar en la base de datos
            const nuevoAnalisis = { id_empresa, id_consultor, marketing }
            await pool.query('INSERT INTO analisis_empresa SET ?', [nuevoAnalisis])
        }

        if (req.user.rol == 'Consultor') {
            res.redirect('/empresas-asignadas/' + codigoEmpresa + '#analisis_')
        } else {
            res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
        }

    }
}
/* ------------------------------------------------------------------------------------------------ */

/********************************************************************************/
// Etapa 3 - Plan Estratégico de Negocio
/********************************************************************************/
// AGREGAR NUEVAS TAREAS x EMPRESA
consultorController.agregarTarea = async (req, res) => {
    const { actividad, fecha_inicio, fecha_entrega, dimension, empresa, nombreEmpresa, email } = req.body
    // nuevaTarea.fecha_inicio = new Date().toLocaleDateString("en-CA")
    const nuevaTarea = { actividad, fecha_inicio, fecha_entrega, dimension, empresa }
    /** Enviando Notificación al Email de nueva tarea */
    const asunto = 'Se ha agregado una nueva tarea';
    const template = tareaNuevaHTML(actividad, nombreEmpresa);
    const resultEmail = await sendEmail(email, asunto, template)
    if (resultEmail == false) {
        console.log("\n<<<<< Ocurrio un error inesperado al enviar el email tarea nueva >>>> \n")
    } else {
        console.log("\n<<<<< Se ha notificado al email ("+email+") que se ha agregado una nueva tarea >>>>>\n")
    }
    /******************************************************* */
    const tarea = await pool.query('INSERT INTO plan_estrategico SET ?', [nuevaTarea])
    console.log("INFO TAREA DB >>> ", tarea)
    res.send(tarea)
}

consultorController.editarTarea = async (req, res) => {
    const { idTarea } = req.body
    const infoTarea = await pool.query('SELECT * FROM plan_estrategico WHERE id = ?', [idTarea])
    res.send(infoTarea[0])
}

// ACTUALIZAR TAREA x EMPRESA CON BASE A SU ID
consultorController.actualizarTarea = async (req, res) => {
    const { actividad, responsable, observacion, fecha_inicio, fecha_entrega, dimension, mensaje, estado } = req.body
    const actualizarTarea = { actividad, responsable, observacion, fecha_inicio, fecha_entrega, dimension, mensaje, estado }
    const { idTarea } = req.body

    if (estado == 2) {
        const email = req.body.email;
        const asunto = 'Haz completado una tarea';
        const template = tareaCompletadaHTML(actividad);
        const resultEmail = await sendEmail(email, asunto, template)
        if (resultEmail == false) {
            console.log("\n<<<<< Ocurrio un error inesperado al enviar el email tarea completada >>>> \n")
        } else {
            console.log("\n<<<<< Se ha notificado la tarea completada al email de la empresa >>>>>\n")
        }
    }

    const tarea = await pool.query('UPDATE plan_estrategico SET ? WHERE id = ?', [actualizarTarea, idTarea])
    console.log("INFO TAREA DB >>> ", tarea)
    res.send(tarea)
}

// ELIMINAR TAREA x EMPRESA CON BASE A SU ID
consultorController.eliminarTarea = async (req, res) => {
    const { idTarea } = req.body
    const infoTarea = await pool.query('DELETE FROM plan_estrategico WHERE id = ?', [idTarea])
    console.log("INFO ELIMINAR >> ", infoTarea)
    res.send(true)
}

/************************************************************************************************* */
consultorController.nuevoRendimiento = async (req, res) => {
    let { total_ventas, total_compras, total_gastos, codigo } = req.body
    let datosTabla = await consultarDatos('empresas')
    datosTabla = datosTabla.find(item => item.codigo == codigo)
    const empresa = datosTabla.id_empresas
    const fecha = new Date().toLocaleDateString('en-US')
    // RENDIMIENTO DE LA EMPRESA
    total_ventas = total_ventas.replace(/[$ ]/g, '');
    total_ventas = total_ventas.replace(/[,]/g, '.');
    total_compras = total_compras.replace(/[$ ]/g, '');
    total_compras = total_compras.replace(/[,]/g, '.');
    total_gastos = total_gastos.replace(/[$ ]/g, '');
    total_gastos = total_gastos.replace(/[,]/g, '.');
    const utilidad = parseFloat(total_ventas) - parseFloat(total_compras) - parseFloat(total_gastos)
    const nuevoRendimiento = { empresa, total_ventas, total_compras, total_gastos, utilidad, fecha }
    await pool.query('INSERT INTO rendimiento_empresa SET ?', [nuevoRendimiento])
    let redireccionar = '/empresas/' + codigo
    if (req.user.rol == 'Consultor') {
        redireccionar = '/empresas-asignadas/' + codigo;
    }
    res.redirect(redireccionar)
}