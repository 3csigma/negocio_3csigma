const consultorController = exports;
const pool = require('../database')
const { sendEmail, propuestaAnalasisHTML, tareaCompletadaHTML, tareaNuevaHTML } = require('../lib/mail.config')
const { consultarDatos } = require('../lib/helpers')

// Dashboard Administrativo
consultorController.index = async (req, res) => {
    const { codigo } = req.user
    let empresas = []
    const consultores = await consultarDatos('consultores')
    const consultor = consultores.find(x => x.codigo == codigo)
    const consultores_asignados = await consultarDatos('consultores_asignados', `WHERE consultor = ${consultor.id_consultores} ORDER BY id DESC LIMIT 2`)
    const idEmpresas = consultores_asignados.reduce((acc,item) => {
        if(!acc.includes(item.empresa)) acc.push(item.empresa);
        return acc;
    },[])
    let dataEmpresas = await consultarDatos('empresas')
    idEmpresas.forEach(x => {
        const e = dataEmpresas.find(i => i.id_empresas == x)
        if (e) empresas.push(e);
    })

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE EMPRESAS ASIGANADAS MENSUALMENTE <<====
    const empresas_asignadas = await pool.query("SELECT * FROM (SELECT * FROM historial_empresas_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);
    let datosJson_empresas_asignadas
    if (empresas_asignadas.length > 0) { datosJson_empresas_asignadas = JSON.stringify(empresas_asignadas) }
    // FIN DE LA FUNCIÓN <<====

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE INFORMES REGISTRADOS MENSUALMENTE <<====
    const historialInformes = await pool.query("SELECT * FROM (SELECT * FROM historial_informes_consultor WHERE idConsultor = ? ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;", [consultor.id_consultores]);
    let datosJson_historialI_consultor
    if (historialInformes.length > 0) { datosJson_historialI_consultor = JSON.stringify(historialInformes) }
    // FIN DE LA FUNCIÓN <<====

    // Informe de diagnóstico de empresa subido
    let ultimosInformes = await consultarDatos('informes', 'ORDER BY id_informes DESC LIMIT 2')
    ultimosInformes = ultimosInformes.filter(x => x.id_consultor == consultor.id_consultores)
    if (ultimosInformes.length > 0) {
        ultimosInformes.forEach(x => {
            if (x.nombre == 'Informe diagnóstico') { x.etapa = 'Diagnóstico' }
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

// EMPRESAS ASIGANADAS
consultorController.empresasAsignadas = async (req, res) => {

    const empresas = []
    let consulActual = await consultarDatos('consultores')
    consulActual = consulActual.find(x => x.codigo == req.user.codigo)
    const consultoresAsignados = await consultarDatos('consultores_asignados')

    let tablaEmpresas = await pool.query('SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.id_empresa, p.diagnostico_negocio, p.analisis_negocio, a.id_empresa, a.estadoAcuerdo, d.consecutivo, d.id_empresa FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa" LEFT OUTER JOIN dg_empresa_establecida d ON d.id_empresa = e.id_empresas')

    tablaEmpresas.forEach(data => {
        const tieneConsultor = consultoresAsignados.filter(x => x.consultor == consulActual.id_consultores && x.empresa == data.id_empresas)

        console.group("\nEmpresa ID -> ", data.id_empresas)
        console.log("Info tiene consultor: ", tieneConsultor)
        console.groupEnd()

        if (tieneConsultor.length > 0) {
            empresas.push(data)
        }

    });

    if (empresas.length > 0) {
        const informe = await consultarDatos('informes')
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
        })
    }

    res.render('consultor/empresas', { consultorDash: true, itemActivo: 2, empresas })
}

/* ------------------------------------------------------------------------------------------------ */
// PROPUESTA DE ANÁLISIS DE NEGOCIO
consultorController.enviarPropuesta = async (req, res) => {
    const { precioPropuesta, idEmpresa, codigo, tipo_propuesta } = req.body
    const empresas = await consultarDatos('empresas')
    const empresa = empresas.find(x => x.codigo == codigo)
    const email = empresa.email
    const nombreEmpresa = empresa.nombre_empresa
    const propuestasDB = await consultarDatos('propuestas');
    const fila = propuestasDB.find(i => i.empresa == idEmpresa && i.tipo_propuesta == tipo_propuesta)
    // const fila2 = propuestasDB.find(i => i.empresa == idEmpresa && i.tipo_propuesta == 'Plan empresarial')
    const link_propuesta = '../propuestas_empresa/' + urlPropuestaNegocio
    const fecha = new Date().toLocaleDateString("en-US")
    const precio_per1 = parseFloat(precioPropuesta) * 0.6
    const precio_per2 = parseFloat(precioPropuesta) * 0.2
    const precio_per3 = parseFloat(precioPropuesta) * 0.2

    let hash = '#analisis_';
    const actualizarPropuesta = { precio_total: precioPropuesta, precio_per1, precio_per2, precio_per3, fecha, link_propuesta }
    const nuevaPropuesta = { empresa: idEmpresa, tipo_propuesta, precio_total: precioPropuesta, precio_per1, precio_per2, precio_per3, fecha, link_propuesta }

    if (tipo_propuesta == 'Plan estratégico') {
        hash = '#plan-estrategico';
    } else if (tipo_propuesta == 'Plan empresarial') {
        hash = '#plan-empresarial';
    } else {
        hash = hash;
    }

    if (fila) {
        await pool.query('UPDATE propuestas SET ? WHERE empresa = ? AND tipo_propuesta = ?', [actualizarPropuesta, idEmpresa, tipo_propuesta]);
    } else {
        await pool.query('INSERT INTO propuestas SET ?', [nuevaPropuesta]);
    }

    /** INFO PARA ENVÍO DE EMAIL */
    const asunto = "Tenemos una propuesta para tu empresa"
    // Obtener la plantilla de Email
    const template = propuestaAnalasisHTML(nombreEmpresa);

    // Enviar Email
    const resultEmail = await sendEmail(email, asunto, template)

    if (resultEmail == false) {
        console.log("Ocurrio un error inesperado al enviar el email propuesta de análisis")
    } else {
        console.log("\n<<<<< Se envió Email de la propuesta de Análisis de Negocio >>>>>\n")
    }

    res.redirect('/empresas/' + codigo + hash)
}

// ANÁLISIS DIMENSIÓN PRODUCTO
consultorController.analisisProducto = async (req, res) => {
    const { codigo } = req.params;
    res.render('consultor/analisisProducto', { wizarx: true, user_dash: false, adminDash: false, codigo })
}
consultorController.guardarAnalisisProducto = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await consultarDatos('empresas')
    const analisis_empresa = await consultarDatos('analisis_empresa');

    empresa = empresa.find(item => item.codigo == codigoEmpresa)

    let id_empresa;

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
            const nuevoAnalisis = { id_empresa, producto }
            await pool.query('INSERT INTO analisis_empresa SET ?', [nuevoAnalisis])
        }
        
        res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
    }
}

// ANÁLISIS DIMENSIÓN ADMINISTRACIÓN
consultorController.analisisAdministracion = async (req, res) => {
    const { codigo } = req.params;
    res.render('consultor/analisisAdministracion', { wizarx: true, user_dash: false, adminDash: false, codigo })
}
consultorController.guardarAnalisisAdministracion = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await consultarDatos('empresas')
    const analisis_empresa = await consultarDatos('analisis_empresa');

    empresa = empresa.find(item => item.codigo == codigoEmpresa)

    if (empresa) {
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
            const nuevoAnalisis = { id_empresa, administracion }
            await pool.query('INSERT INTO analisis_empresa SET ?', [nuevoAnalisis])
        }

        res.redirect('/empresas/' + codigoEmpresa + '#analisis_')
    }
}

// ANÁLISIS DIMENSIÓN OPERACION
consultorController.analisisOperacion = async (req, res) => {
    const { codigo } = req.params;
    res.render('consultor/analisisOperacion', { wizarx: true, user_dash: false, adminDash: false, codigo })
}
consultorController.guardarAnalisisOperacion = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await consultarDatos('empresas')
    const analisis_empresa = await consultarDatos('analisis_empresa');
    empresa = empresa.find(item => item.codigo == codigoEmpresa)

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
            const nuevoAnalisis = { id_empresa, operacion }
            await pool.query('INSERT INTO analisis_empresa SET ?', [nuevoAnalisis])
        }

        res.redirect('/empresas/' + codigoEmpresa + '#analisis_')

    } else {
        console.log("Error no sé encontró la empresa y el consultor ligado..")
    }
}

// ANÁLISIS DIMENSIÓN MARKETING
consultorController.analisisMarketing = async (req, res) => {
    const { codigo } = req.params;
    res.render('consultor/analisisMarketing', { wizarx: true, user_dash: false, adminDash: false, codigo })
}
consultorController.guardarAnalisisMarketing = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    // Verificando si existen registros Análisis de empresa en la Base de datos
    let empresa = await consultarDatos('FROM empresas')
    const analisis_empresa = await consultarDatos('analisis_empresa');

    empresa = empresa.find(item => item.codigo == codigoEmpresa)

    if (empresa) {
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
            const nuevoAnalisis = { id_empresa, marketing }
            await pool.query('INSERT INTO analisis_empresa SET ?', [nuevoAnalisis])
        }

        res.redirect('/empresas/' + codigoEmpresa + '#analisis_')

    }
}
/* ------------------------------------------------------------------------------------------------ */

/********************************************************************************/
// Etapa 3 - Plan Estratégico de Negocio
/********************************************************************************/
// AGREGAR NUEVAS TAREAS x EMPRESA
consultorController.agregarTarea = async (req, res) => {
    const { actividad, fecha_inicio, fecha_entrega, dimension, empresa, nombreEmpresa, email, prioridad } = req.body
    // nuevaTarea.fecha_inicio = new Date().toLocaleDateString("en-CA")
    const nuevaTarea = { actividad, fecha_inicio, fecha_entrega, dimension, empresa, prioridad }
    /** Enviando Notificación al Email de nueva tarea */
    const asunto = 'Se ha agregado una nueva tarea';
    const template = tareaNuevaHTML(actividad, nombreEmpresa);
    const resultEmail = await sendEmail(email, asunto, template);
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
    const { actividad, responsable, observacion, fecha_inicio, fecha_entrega, dimension, mensaje, estado, prioridad } = req.body
    const actualizarTarea = { actividad, responsable, observacion, fecha_inicio, fecha_entrega, dimension, mensaje, estado, prioridad }
    
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
    res.redirect('/empresas/' + codigo)
}