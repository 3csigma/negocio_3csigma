const pool = require('../database')
const empresaController = exports;
const { encriptarTxt, desencriptarTxt, consultarTareasEmpresarial, consultarInformes, consultarDatos, tareasGenerales, eliminarDatos, insertarDatos, cargarArchivo } = require('../lib/helpers')
const { sendEmail, archivosCargadosHTML } = require('../lib/mail.config');
const { Country } = require('country-state-city');
const stripe = require('stripe')(process.env.CLIENT_SECRET_STRIPE);
const portalClientes = process.env.PORTAL_CLIENTES;

let pagoPendiente = true, diagnosticoPagado = false, etapa1, consulAsignado = {}, id_empresa = false, etapaCompleta = {};
let modalAcuerdo = false;

/** Función para mostrar Dashboard de Empresas */
empresaController.index = async (req, res) => {
    diagnosticoPagado = false;
    etapaCompleta = {};
    consulAsignado = {};
    modalAcuerdo = false;
    req.session.intentPay = undefined; // Intento de pago
    const empresas = await consultarDatos('empresas')
    const empresa = empresas.find(x => x.email == req.user.email)
    id_empresa = empresa.id_empresas;
    let idEmpresaActual = empresa.id_empresas;
    etapa1 = {};

    // VALIDACIÓN PARA SABER SI LA EMPRESA TIENE CONSULTOR DE DIAGNÓSTICO ASIGNADO
    let cAsignado = await consultarDatos("consultores_asignados")
    if (cAsignado.length > 0) {
        const c1 = cAsignado.find(x => x.empresa == idEmpresaActual && x.orden == 1)
        c1 ? consulAsignado.c1 = c1 : consulAsignado.c1 = false;
        
        const c2 = cAsignado.find(x => x.empresa == idEmpresaActual && x.orden == 2)
        c2 ? consulAsignado.c2 = c2 : consulAsignado.c2 = false;

        const c3 = cAsignado.find(x => x.empresa == idEmpresaActual && x.orden == 3)
        c3 ? consulAsignado.c3 = c3 : consulAsignado.c3 = false;

        const c4 = cAsignado.find(x => x.empresa == idEmpresaActual && x.orden == 4)
        c4 ? consulAsignado.c4 = c4 : consulAsignado.c4 = false;
    }

    /** Consultando que pagos ha realizado el usuario */
    const pagos = await consultarDatos('pagos')
    let pago_empresa = pagos.find(i => i.id_empresa == id_empresa);
    if (!pago_empresa) {
        diagnosticoPagado = false;
        const estado = JSON.stringify({estado:0})
        const nuevoPago = { 
            id_empresa,
            diagnostico_negocio: estado,
            analisis_negocio: estado,
            analisis_negocio1: JSON.stringify({estado:1}),
            analisis_negocio2: estado,
            analisis_negocio3: estado,
            estrategico: estado,
            empresarial0: estado,
            empresarial1: JSON.stringify({estado:1}),
            empresarial2: estado,
            empresarial3: estado,
        }
        await insertarDatos('pagos', nuevoPago)
    } else {
        const objDiagnostico = JSON.parse(pago_empresa.diagnostico_negocio)
            if (objDiagnostico.estado == 1) {
                // PAGÓ EL DIAGNOSTICO
                diagnosticoPagado = objDiagnostico;
                /** Consultando si el usuario ya firmó el acuerdo de confidencialidad */
                let acuerdo = await consultarDatos('acuerdo_confidencial')
                acuerdo = acuerdo.find(x => x.id_empresa == id_empresa);
                if (!acuerdo) {
                    modalAcuerdo = true;
                }
            }

    }

    /** ETAPAS DEL DIAGNOSTICO EN LA EMPRESA */
    const dataEmpresa = await pool.query('SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.*, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = ? LEFT OUTER JOIN pagos p ON p.id_empresa = ? LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = ? INNER JOIN users u ON u.codigo = ? AND rol = "Empresa" LIMIT 1', [id_empresa, id_empresa, id_empresa, empresa.codigo])
    const diagEmpresa = await pool.query('SELECT * FROM dg_empresa_establecida WHERE id_empresa = ? LIMIT 1', [id_empresa])
    const diagEmpresa2 = await pool.query('SELECT * FROM dg_empresa_nueva WHERE id_empresa = ? LIMIT 1', [id_empresa])
    
    /**
     * diagEmpresa -> EMPRESA ESTABLECIDA
     * diagEmpresa2 -> EMPRESA NUEVA
     */

    // INFORMES DE LA EMPRESA
    const informes_empresa = await consultarDatos('informes')

    /**************************************************************************** */
    // PORCENTAJE ETAPA 1
    let porcentaje = 100/6, porcentajeEtapa1 = 0;
    porcentaje = Math.round(porcentaje)
    const diagPorcentaje = { num : 0 }

    const e = dataEmpresa[0];
    const diagnosticoPago = JSON.parse(e.diagnostico_negocio)
        if (diagnosticoPago.estado == 1){
            diagPorcentaje.txt = 'Diagnóstico pagado'
            porcentajeEtapa1 = porcentaje
        }
    if (e.estadoAcuerdo == 1){
        diagPorcentaje.txt = 'Acuerdo enviado'
        porcentajeEtapa1 = porcentaje*2
    }
    if (e.estadoAcuerdo == 2){
        diagPorcentaje.txt = 'Acuerdo firmado'
        porcentajeEtapa1 = porcentaje*3
    } 
    if (e.telefono){
        diagPorcentaje.txt = 'Ficha Cliente'
        porcentajeEtapa1 = porcentaje*4
    }

    if (diagEmpresa.length > 0 || diagEmpresa2.length > 0){
        diagPorcentaje.txt = 'Cuestionario diagnóstico'
        porcentajeEtapa1 = porcentaje*5
    }

    // VERIFICACIÓN DE ETAPAS FINALIZADAS (Estapa 1)
    const informeEtapa1 = informes_empresa.find(x => x.id_empresa == id_empresa && x.nombre == 'Informe diagnóstico')
    if (informeEtapa1) {
        porcentajeEtapa1 = 100;
        etapaCompleta.e1 =  true

        /*****************************************************
         * VALIDANDO EL TIPO DE EMPRESA (NUEVA O ESTABLECIDA) - PARA HABILITAR EL MENÚ
        */
        // Empresa Establecida
        if (diagEmpresa.length > 0) {
            etapaCompleta.verAnalisis = true;
            etapaCompleta.verEmpresarial = true;
        // Empresa Nueva
        } else if (diagEmpresa2.length > 0) {
            etapaCompleta.verAnalisis = false;
            etapaCompleta.verEmpresarial = true;
        }
    }

    // Informe de diagnóstico de empresa subido
    let ultimosInformes = await consultarDatos('informes', 'ORDER BY id_informes DESC LIMIT 2')
    ultimosInformes = ultimosInformes.filter(x => x.id_empresa == id_empresa)
    if (ultimosInformes.length > 0) {
        ultimosInformes.forEach(x => {
            if (x.nombre == 'Informe diagnóstico') {
                x.etapa = 'Diagnóstico'
            }
            if (x.nombre == 'Informe de dimensión producto' || x.nombre == 'Informe de dimensión administración' || x.nombre == 'Informe de dimensión operaciones' || x.nombre == 'Informe de dimensión marketing' || x.nombre == 'Informe de análisis') { x.etapa = 'Análisis' }
            if (x.nombre == 'Informe de plan estratégico') { x.etapa = 'Plan estratégico' }
        })
    }

    /****************************************************************************** */
    // PORCENTAJE ETAPA 2
    // let porcentaje2 = 100/4
    // porcentaje2 = Math.round(porcentaje2)
    let analisisEmpresa = await consultarDatos('analisis_empresa')
    analisisEmpresa = analisisEmpresa.find(i => i.id_empresa == id_empresa)
    let porcentajeEtapa2 = 0;
    if (analisisEmpresa) {
        if (analisisEmpresa.producto){ porcentajeEtapa2 = porcentajeEtapa2 + 12.5 }
        if (analisisEmpresa.administracion){ porcentajeEtapa2 = porcentajeEtapa2 + 12.5 }
        if (analisisEmpresa.operacion){ porcentajeEtapa2 = porcentajeEtapa2 + 12.5 }
        if (analisisEmpresa.marketing){ porcentajeEtapa2 = porcentajeEtapa2 + 12.5 }
    }

    const informeProducto = informes_empresa.find(x => x.id_empresa == id_empresa && x.nombre == 'Informe de dimensión producto')
    if (informeProducto) porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
    const informeAdministracion = informes_empresa.find(x => x.id_empresa == id_empresa && x.nombre == 'Informe de dimensión administración')
    if (informeAdministracion) porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
    const informeOperaciones = informes_empresa.find(x => x.id_empresa == id_empresa && x.nombre == 'Informe de dimensión operaciones')
    if (informeOperaciones) porcentajeEtapa2 = porcentajeEtapa2 + 12.5;
    const informeMarketing = informes_empresa.find(x => x.id_empresa == id_empresa && x.nombre == 'Informe de dimensión marketing')
    if (informeMarketing) porcentajeEtapa2 = porcentajeEtapa2 + 12.5;

    const informeEtapa2 = informes_empresa.find(x => x.id_empresa == id_empresa && x.nombre == 'Informe de análisis')
    if (informeEtapa2) {
        porcentajeEtapa2 = 100;
        etapaCompleta.e2 = true;
        etapaCompleta.verEstrategico = true;
    }

    /************************************************************************** */
    // PORCENTAJE ETAPA 3
    let porcentajeEtapa3 = 0
    let tareas_plan_empresarial = await consultarDatos('tareas_plan_empresarial')
    tareas_plan_empresarial = tareas_plan_empresarial.filter(x => x.empresa == id_empresa)
    const totalTareas_empresarial = tareas_plan_empresarial.length;
    let tareasCompletadas_empresarial = tareas_plan_empresarial.filter(x => x.estado == 2)
    tareasCompletadas_empresarial = tareasCompletadas_empresarial.length
    if (totalTareas_empresarial > 0) {
        porcentajeEtapa3 = ((tareasCompletadas_empresarial/totalTareas_empresarial)*100)*0.75
        porcentajeEtapa3 = Math.round(porcentajeEtapa3)
    }
    if (empresa.etapa_empresarial == 1) {
        porcentajeEtapa3 = 100;
        etapaCompleta.e3 = true;
        if (etapaCompleta.verEmpresarial) {
            etapaCompleta.verEstrategico = true;
        }
    }

    /************************************************************************** */
    // PORCENTAJE ETAPA 4
    let porcentajeEtapa4 = 0
    let tareasEmpresa = await consultarDatos('tareas_plan_estrategico')
    tareasEmpresa = tareasEmpresa.filter(x => x.empresa == id_empresa)
    const totalTareas = tareasEmpresa.length;
    let tareasCompletadas = tareasEmpresa.filter(x => x.estado == 2)
    tareasCompletadas = tareasCompletadas.length
    let verGraficasCircular = false;
    if (totalTareas > 0) {
        porcentajeEtapa4 = ((tareasCompletadas/totalTareas)*100)*0.75
        porcentajeEtapa4 = Math.round(porcentajeEtapa4)
        verGraficasCircular = true;
    }
    const informeEtapa4 = informes_empresa.find(x => x.id_empresa == id_empresa && x.nombre == 'Informe de plan estratégico')
    if (informeEtapa4) {
        porcentajeEtapa4 = 100;
        etapaCompleta.e4 = true;
    }

    /************************************************************************** */


    /**************************************
     * PORCENTAJE GENERAL DE LA EMPRESA
    */
    // Empresa Establecida
    let porcentajeTotal = Math.round((porcentajeEtapa1 + porcentajeEtapa2 + porcentajeEtapa3 + porcentajeEtapa4)/4)
    // Empresa Nueva
    if (diagEmpresa2.length > 0) {
        porcentajeTotal = Math.round((porcentajeEtapa1 + porcentajeEtapa3 + porcentajeEtapa4)/3)
    }
    

    /************** DATOS PARA LAS GRÁFICAS AREAS VITALES & POR DIMENSIONES ****************/
    let jsonDimensiones1, jsonDimensiones2, nuevosProyectos = 0, rendimiento = {};
    let jsonAnalisis1, jsonAnalisis2;
    
    let areasVitales = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ LIMIT 2', [empresa.id_empresas])

    if (areasVitales.length > 0) {
        jsonAnalisis1 = JSON.stringify(areasVitales[0]);
        jsonAnalisis2 = JSON.stringify(areasVitales[1]);
        if (areasVitales[0].rendimiento_op >= 1){
            rendimiento.op = areasVitales[0].rendimiento_op
        } else {
            rendimiento.op = false;
        }
    }

    // Si la empresa está Establecida
    let xDimensiones = await pool.query('SELECT * FROM indicadores_dimensiones WHERE id_empresa = ? ORDER BY id ASC LIMIT 1', [id_empresa])
    let xDimensiones2 = await pool.query('SELECT * FROM indicadores_dimensiones WHERE id_empresa = ? ORDER BY id DESC LIMIT 1', [id_empresa])
    if (xDimensiones.length > 0) {
        jsonDimensiones1 = JSON.stringify(xDimensiones[0]);
        jsonDimensiones2 = JSON.stringify(xDimensiones2[0]);
    }

    // Si la empresa es Nueva
    let resCategorias = await pool.query('SELECT * FROM resultado_categorias WHERE id_empresa = ? LIMIT 1', [id_empresa])
    if (resCategorias.length > 0) {
        jsonDimensiones1 = JSON.stringify(resCategorias[0]);
        nuevosProyectos = 1;
        // Rendimiento del Proyecto
        rendimiento.num = resCategorias[0].rendimiento
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

    /************************************************************************************* */
    /** TAREAS ASIGNADAS ETAPA 3 - PLAN ESTRATÉGICO DE NEGOCIO */
    let tareas = await consultarDatos('tareas_plan_estrategico', 'ORDER BY id DESC LIMIT 2')
    tareas = tareas.filter(x => x.empresa == id_empresa)
    tareas.forEach(x => {
        x.fecha_entrega = new Date(x.fecha_entrega).toLocaleDateString('en-US')
    })

    /************************************************************************************* */
    const fechaActual = new Date().toLocaleDateString('fr-CA');
    const dimObj = await tareasGenerales(id_empresa, fechaActual)
    let jsonDim_empresa = false;
    if (dimObj.tareas.todas.length > 0) {
        const listo = dimObj.listo
        jsonDim_empresa = JSON.stringify([
            { ok: (listo[0]), pendiente: (100-listo[0]) },
            { ok: (listo[1]), pendiente: (100-listo[1]) },
            { ok: (listo[2]), pendiente: (100-listo[2]) },
            { ok: (listo[3]), pendiente: (100-listo[3]) }
        ])
    }

    req.session.etapaCompleta = etapaCompleta;
    req.session.consulAsignado = consulAsignado;

    res.render('empresa/dashboard', {
        user_dash: true,
        pagoPendiente,
        diagnosticoPagado,
        itemDashboard: true,
        consulAsignado,
        etapa1,
        porcentajeEtapa1, porcentajeEtapa2, porcentajeEtapa3, porcentajeEtapa4, porcentajeTotal,
        jsonAnalisis1, jsonAnalisis2, jsonDimensiones1, jsonDimensiones2,
        tareas, ultimosInformes, verGraficasCircular,
        nuevosProyectos, rendimiento, jsonDim_empresa, etapaCompleta, modalAcuerdo
    })
}

// Mostrar perfil de Usuarios
empresaController.perfilUsuarios = async (req, res) => {
    const { rol, codigo } = req.user;

    let empresa = await pool.query("SELECT e.*, u.foto,u.rol FROM empresas e JOIN users u ON e.codigo = u.codigo WHERE e.codigo = ?", [codigo])
    empresa = empresa[0]
    let consultor = await pool.query("SELECT c.*, u.foto, u.rol FROM consultores c JOIN users u ON c.codigo = u.codigo WHERE c.codigo = ?", [codigo])
    consultor = consultor[0]

    if (consultor) {
        if(consultor.nivel == 1){
            consultor.nivel = "Business Representative"
        }else if(consultor.nivel == 2){
            consultor.nivel = "Business Leader"
        }else if(consultor.nivel == 3){
            consultor.nivel = "Business Director"
        }else if(consultor.nivel == 4){
            consultor.nivel = "Executive Director"
        }
    }         
    let user_dash = false, adminDash = false, consultorDash = false
    if (rol == 'Empresa') {
        user_dash = true;
        empresa.foto ? empresa.foto = empresa.foto : empresa.foto = "../img/profile_default/user.jpg";
    } else {
        consultor.foto ? consultor.foto = consultor.foto: consultor.foto = "../img/profile_default/user.jpg";
        if (rol == 'Consultor') {
            consultorDash = true;
            consultor.nivel
        } else {
            adminDash = true;
            consultor.nivel
        }
    }

    let acuerdo = await consultarDatos('acuerdo_confidencial')
    acuerdo = acuerdo.find(x => x.id_empresa == empresa)

    res.render('pages/profile', {
        rol, adminDash, user_dash, consultorDash, consultor, empresa,
        pagoPendiente,
        diagnosticoPagado,
        etapa1, modalAcuerdo,
        consulAsignado: req.session.consulAsignado, etapaCompleta: req.session.etapaCompleta,
    })
}

empresaController.acuerdoCheck = async (req, res) => {
    /**
     * Estados (Acuerdo de Confidencialidad):
     * No firmado: 0, Firmado: 2
     */
    const {estado} = req.body;
    let datosEmpresa = await consultarDatos('empresas')
    datosEmpresa = datosEmpresa.find(x => x.email == req.user.email)
    let acuerdo = await consultarDatos('acuerdo_confidencial')
    acuerdo = acuerdo.find(x => x.id_empresa == datosEmpresa.id_empresas)
    let objRes = {}
    console.log("\nNo existen datos en la tabla de acuerdo para esta empresa\n")
    // Efectuando firma del acuerdo
    console.log("\nEfectuando firma del acuerdo.....")
    const insertarAcuerdo = {id_empresa: datosEmpresa.id_empresas, estadoAcuerdo: estado}
    // await pool.query('INSERT INTO acuerdo_confidencial SET ?', [insertarAcuerdo])
    await insertarDatos('acuerdo_confidencial', insertarAcuerdo)
    objRes.ok = true;
    objRes.txt = '/diagnostico-de-negocio'
    res.send(objRes)
}

/** Mostrar vista del Panel Diagnóstico de Negocio */
empresaController.diagnostico = async (req, res) => {
    // ID Empresa Global => id_empresa
    // Pago Diagnóstico => diagnosticoPagado
    // Consultor Asignado => consulAsignado
    let existencia = true;
    const estadoPago = {
        color : 'badge-warning',
        texto : 'Pendiente',
        btn : 'background: #85bb65; color: white',
        fecha : 'N/A',
    }

    console.log("ASUDHASIDHUAISDHIAUS ASDAS DAS ASDA SDAS DASDASD ");

    let infoConsul = await consultarDatos('consultores')
    infoConsul = infoConsul.find(x => x.id_consultores == consulAsignado.c1.consultor)
    // let costo = process.env.PRECIO_NIVEL1;

    // if (infoConsul.nivel == '2') {
    //     costo = process.env.PRECIO_NIVEL2;
    // } else if (infoConsul.nivel == '3') {
    //     costo = process.env.PRECIO_NIVEL3;
    // } else if (infoConsul.nivel == '4') {
    //     if (consulAsignado.c1.sede == 1)
    //         costo = process.env.PRECIO_NIVEL4_SEDE1
    //     else if (consulAsignado.c1.sede == 2)
    //         costo = process.env.PRECIO_NIVEL4_SEDE2
    //     else if (consulAsignado.c1.sede == 3)
    //         costo = process.env.PRECIO_NIVEL4_SEDE3
    // }

    // Validando Diagnóstico de negocio ha sido pagado
    if (diagnosticoPagado.estado == 1) {
        existencia = false;
        estadoPago.color = 'badge-success'
        estadoPago.texto = 'Pagado'
        estadoPago.btn = 'background: #656c73; color: white; disabled= "true" '
        costo = diagnosticoPagado.precio;
        estadoPago.fecha = diagnosticoPagado.fecha
        if (consulAsignado.c1.sede == 1) {
            estadoPago.sede = process.env.SEDE1;
        } else {
            estadoPago.sede = process.env.SEDE2;
        }
    }

    /** Consultando si el usuario ya firmó el acuerdo de confidencialidad */
    let acuerdo = await consultarDatos('acuerdo_confidencial')
    acuerdo = acuerdo.find(x => x.id_empresa == id_empresa);
    if (acuerdo) {
        if (acuerdo.estadoAcuerdo == 2) {
            modalAcuerdo = false;
        }
    }

    const formDiag = {}
    formDiag.id = id_empresa;
    formDiag.usuario = encriptarTxt('' + id_empresa)
    formDiag.estado = false;
    const fichaCliente = await consultarDatos('ficha_cliente', `WHERE id_empresa = ${id_empresa}`)
    const ficha = fichaCliente[0]

    if (fichaCliente.length == 0) {
        formDiag.color = 'badge-warning'
        formDiag.texto = 'Pendiente'
        formDiag.fechaLocal = true;
    } else {
        const datos = {}
        datos.redes_sociales = JSON.parse(ficha.redes_sociales)
        datos.objetivos = JSON.parse(ficha.objetivos)
        datos.fortalezas = JSON.parse(ficha.fortalezas)
        datos.problemas = JSON.parse(ficha.problemas)
        formDiag.fecha = ficha.fecha_modificacion

        if (ficha.page_web == '' || datos.redes_sociales.twitter == '' || datos.redes_sociales.facebook == '' || datos.redes_sociales.instagram == '') {
            formDiag.color = 'badge-warning'
            formDiag.texto = 'Incompleto'
            formDiag.estado = true;
        } else {
            formDiag.color = 'badge-success'
            formDiag.estilo = '#000000; color: #FFFF'
            formDiag.texto = 'Completado'
            formDiag.estado = true;
        }
    }

    // Informe de la empresa subido
    let informeEmpresa = await consultarDatos('informes', `WHERE id_empresa = "${id_empresa}" LIMIT 1`)

    res.render('empresa/diagnostico', {
        user_dash: true, pagoDiag: true, formDiag,
        existencia, estadoPago,
        actualYear: req.actualYear,
        etapa1, informe: informeEmpresa[0],
        itemDiagnostico: true,
        consulAsignado: req.session.consulAsignado,
        etapaCompleta: req.session.etapaCompleta, modalAcuerdo,
    })
}

/** Mostrar vista del formulario Ficha Cliente */
empresaController.validarFichaCliente = async (req, res) => {
    const { id } = req.params;
    // let row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
    let row = await consultarDatos('empresas', `WHERE email = "${req.user.email}" LIMIT 1`)
    row = row[0]
    const id_empresa = desencriptarTxt(id)
    if (row.id_empresas == id_empresa) {
        req.session.fichaCliente = true
    } else {
        req.session.fichaCliente = false
    }
    res.redirect('/ficha-cliente')
}

empresaController.fichaCliente = async (req, res) => {
    req.session.fichaCliente = false
    const row = await consultarDatos('empresas', `WHERE email = "${req.user.email}" LIMIT 1`)
    const empresa = row[0]
    const id_empresa = row[0].id_empresas, datos = {};
    const fichaCliente = await consultarDatos('ficha_cliente', `WHERE id_empresa = "${id_empresa}"`)
    const ficha = fichaCliente[0]
    if (fichaCliente.length > 0) {
        ficha.es_propietario === "Si" ? datos.prop1 = 'checked' : datos.prop2 = 'checked';
        ficha.socios === 'Si' ? datos.socio1 = 'checked' : datos.socio2 = 'checked';
        ficha.etapa_actual === 'En Proyecto' ? datos.etapa1 = 'checked' : datos.etapa1 = ''
        ficha.etapa_actual === 'Operativo' ? datos.etapa2 = 'checked' : datos.etapa2 = ''
        ficha.etapa_actual === 'En expansión' ? datos.etapa3 = 'checked' : datos.etapa3 = ''
        ficha.etapa_actual === 'Otro' ? datos.etapa4 = 'checked' : datos.etapa4 = ''

        datos.redes_sociales = JSON.parse(ficha.redes_sociales)
        datos.objetivos = JSON.parse(ficha.objetivos)
        datos.fortalezas = JSON.parse(ficha.fortalezas)
        datos.problemas = JSON.parse(ficha.problemas)

        datos.descripcion = ficha.descripcion;
        datos.motivo = ficha.motivo_consultoria;

        datos.socioMin = 1;

        if (datos.socio2) {
            datos.estiloSocio = 'background:#f2f2f2;'
            datos.socioNo = 'disabled'
            datos.socioMin = 0;
        }

    }
    // Obteniendo todos los países
    datos.paises = Country.getAllCountries();
    // Capturando Fecha Máxima - 18 años atrás
    let fm = new Date()
    const max = fm.getFullYear() - 18; // Restando los años
    fm.setFullYear(max) // Asignando nuevo año
    const fechaMaxima = fm.toLocaleDateString("fr-CA"); // Colocando el formato yyyy-mm-dd
    console.log(fechaMaxima);

    res.render('empresa/fichaCliente', { ficha, datos, fechaMaxima, wizarx: true, user_dash: false, empresa })
}

empresaController.addFichaCliente = async (req, res) => {
    let { nombres, apellidos, email, countryCode, telFicha, fecha_nacimiento, pais, twitter, facebook, instagram, otra, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivo1, objetivo2, objetivo3, fortaleza1, fortaleza2, fortaleza3, problema1, problema2, problema3, motivo_consultoria, fecha_zh } = req.body
    let redes_sociales = JSON.stringify({ twitter, facebook, instagram, otra })
    let objetivos = JSON.stringify({ objetivo1, objetivo2, objetivo3 })
    let fortalezas = JSON.stringify({ fortaleza1, fortaleza2, fortaleza3 })
    let problemas = JSON.stringify({ problema1, problema2, problema3 })
    const telefono = "+" + countryCode + " " + telFicha;

    es_propietario != undefined ? es_propietario : es_propietario = 'No'
    socios != undefined ? socios : socios = 'No'
    const row = await consultarDatos('empresas', `WHERE email = "${req.user.email}" LIMIT 1`)
    const id_empresa = row[0].id_empresas;
    cantidad_socios == null ? cantidad_socios = 0 : cantidad_socios = cantidad_socios;

    const fecha_modificacion = new Date().toLocaleString("en-US", { timeZone: fecha_zh })

    page_web = page_web.replace(/[$ ]/g, '');

    const nuevaFichaCliente = {
        telefono, fecha_nacimiento, pais, redes_sociales, es_propietario, socios, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivos, fortalezas, problemas, motivo_consultoria, id_empresa, fecha_modificacion
    }

    const userUpdate = { nombres, apellidos, nombre_empresa, email }

    // Actualizando datos bases de la empresa
    await pool.query('UPDATE empresas SET ? WHERE id_empresas = ?', [userUpdate, id_empresa])

    // Consultar si ya existen datos en la Base de datos
    const ficha = await consultarDatos('ficha_cliente', `WHERE id_empresa = "${id_empresa}"`)
    if (ficha.length > 0) {
        await pool.query('UPDATE ficha_cliente SET ? WHERE id_empresa = ?', [nuevaFichaCliente, id_empresa])
    } else {
        // await pool.query('INSERT INTO ficha_cliente SET ?', [nuevaFichaCliente])
        await insertarDatos('ficha_cliente', nuevaFichaCliente)
    }
    // JSON.parse(redes_sociales) // CONVERTIR  JSON A UN OBJETO
    res.redirect('/diagnostico-de-negocio')
}

empresaController.eliminarFicha = async (req, res) => {
    const { id } = req.body;
    // const ficha = await pool.query('DELETE FROM ficha_cliente WHERE id_empresa = ?', [id])
    const ficha = await eliminarDatos('ficha_cliente', `WHERE id = ${id}`)
    let respu = undefined;
    // console.log(ficha.affectedRows)
    if (ficha.affectedRows > 0) {
        console.log("Eliminando ficha cliente")
        respu = true;
    } else {
        respu = false;
    }
    res.send(respu)
}

/** Mostrar vista del Panel Análisis de Negocio */
empresaController.analisis = async (req, res) => {
    const btnPagar = {};
    const row = await consultarDatos('empresas', `WHERE email = "${req.user.email}" LIMIT 1`)
    const id_empresa = row[0].id_empresas;
    const propuestas = await consultarDatos('propuestas')
    const propuesta = propuestas.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Análisis de negocio')
    const pagos = await consultarDatos('pagos')
    const pago_empresa = pagos.find(i => i.id_empresa == id_empresa)
    const etapa1 = { lista: true }
    let tienePropuesta = false

    let escena1 = false, escena2 = false, escena3 = false, escena4 = false, escena5 = false, escena6 = false, activarPagoUnico = true,
        msgActivo, msgDesactivo, msgDesactivo2 = true, msgDesactivo3 = true,
        btnActivo = "background: #85bb65;margin: 0 auto;border-color: #85bb65;",
        btnDesactivo = "background: #656c73;margin: 0 auto;border-color: #656c73;"
    /************************************************************************************* */
    // PROPUESTA DE ANÁLISIS DE NEGOCIO -- VALIDANDO PAGOS DE ANÁLISIS DE NEGOCIO
    if (propuesta) {
        tienePropuesta = true
        btnPagar.etapa1 = false;
        btnPagar.activar1 = false;
        btnPagar.etapa2 = true;
        btnPagar.activar2 = true;
        propuesta.pagada = false;

        /************************************************************************************* */
        const objAnalisis = JSON.parse(pago_empresa.analisis_negocio)
        const objAnalisis1 = JSON.parse(pago_empresa.analisis_negocio1)
        const objAnalisis2 = JSON.parse(pago_empresa.analisis_negocio2)
        const objAnalisis3 = JSON.parse(pago_empresa.analisis_negocio3)

        // PAGÓ EL ANÁLISIS
        if (objAnalisis.estado == 1) {
            btnPagar.etapa1 = false;
            btnPagar.activar1 = false;
            btnPagar.etapa2 = true;
            btnPagar.activar2 = false;
            propuesta.pagada = true;
            btnPagar.analisisPer = true
            propuesta.precio_total = objAnalisis.precio;
        }

        btnPagar.obj1 = parseInt(objAnalisis1.estado)
        btnPagar.obj2 = parseInt(objAnalisis2.estado)
        btnPagar.obj3 = parseInt(objAnalisis3.estado)

        if (objAnalisis1.estado == 2) {
            btnPagar.etapa1 = false;
            btnPagar.activar1 = false;
            btnPagar.etapa2 = true;
            btnPagar.activar2 = true;
            btnPagar.analisisPer = true;
            propuesta.porcentaje = "60%";
        }
        if (objAnalisis2.estado == 2) { propuesta.porcentaje = "80%"; }
        if (objAnalisis3.estado == 2) { propuesta.porcentaje = "100%"; }

        let fechaDB = new Date(objAnalisis1.fecha)
        let fechaDB2 = new Date(objAnalisis1.fecha)

        if (msgDesactivo2) {
            fechaDB.setDate(fechaDB2.getDate() + 30);
            fechaDB = fechaDB.toLocaleDateString("en-US")
            msgDesactivo2 = "Pago disponible apartir de: " + fechaDB + ""
        }

        if (msgDesactivo3) {
            fechaDB2.setDate(fechaDB2.getDate() + 60);
            fechaDB2 = fechaDB2.toLocaleDateString("en-US")
            msgDesactivo3 = "Pago disponible apartir de: " + fechaDB2 + ""
        }

        if (objAnalisis.estado == 1) {
            escena6 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Análisis de negocio pagado"
            msgDesactivo2 = "Análisis de negocio pagado"
            msgDesactivo3 = "Análisis de negocio pagado"
        } else if (btnPagar.obj1 == 1 && btnPagar.obj2 == 0 && btnPagar.obj3 == 0) {
            escena1 = true
            msgActivo = "Primera cuota lista para pagarse"
            btnActivo
            msgDesactivo = "Pago no disponible aun"
            btnDesactivo
        } else if (btnPagar.obj1 != 1 && btnPagar.obj2 == 0 && btnPagar.obj3 == 0) {
            escena2 = true
            activarPagoUnico = false
            msgDesactivo = "Primera cuota pagada"
            msgDesactivo2
            msgDesactivo3
            btnDesactivo
        } else if (btnPagar.obj1 == 2 && btnPagar.obj2 == 1 && btnPagar.obj3 == 0) {
            escena3 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Primera cuota pagada"
            msgActivo = "Segunda cuota lista para pagarse"
            btnActivo
            msgDesactivo3
        } else if (btnPagar.obj1 == 2 && btnPagar.obj2 == 2 && btnPagar.obj3 == 0) {
            escena4 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Primera cuota pagada"
            msgDesactivo2 = "Segunda cuota pagada"
            msgDesactivo3
        } else if (btnPagar.obj1 == 2 && btnPagar.obj2 == 2 && btnPagar.obj3 == 1) {
            escena5 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Primera cuota pagada"
            msgDesactivo2 = "Segunda cuota pagada"
            msgActivo = "Tercera cuota lista para pagarse"
            btnActivo
        } else if (btnPagar.obj1 == 2 && btnPagar.obj2 == 2 && btnPagar.obj3 == 2) {
            escena6 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Primera cuota pagada"
            msgDesactivo2 = "Segunda cuota pagada"
            msgDesactivo3 = "Tercera cuota pagada"
        }
    }

    /************************************************************************************* */
    // ARCHIVOS CARGADOS - ANÁLISIS DE NEGOCIO
    let archivos = await consultarDatos('archivos_analisis')
    archivos = archivos.filter(i => i.empresa == id_empresa)
    if (archivos.length > 0) {
        archivos.forEach(x => {
            x.estado = 'Pendiente';
            x.color = 'warning';
            x.display = 'none';
            if (x.link != null) {
                x.estado = 'Cargado';
                x.color = 'success';
                x.display = 'block';
            }
        })
    } else {
        archivos = false;
    }
    /************************************************************************************* */

    const informesAnalisis = []
    const info0Analisis = await consultarInformes(id_empresa, "Informe de análisis")
    const info1Analisis = await consultarInformes(id_empresa, "Informe de dimensión producto")
    const info2Analisis = await consultarInformes(id_empresa, "Informe de dimensión administración")
    const info3Analisis = await consultarInformes(id_empresa, "Informe de dimensión operaciones")
    const info4Analisis = await consultarInformes(id_empresa, "Informe de dimensión marketing")
    info0Analisis ? informesAnalisis.push(info0Analisis) : false;
    info1Analisis ? informesAnalisis.push(info1Analisis) : false;
    info2Analisis ? informesAnalisis.push(info2Analisis) : false;
    info3Analisis ? informesAnalisis.push(info3Analisis) : false;
    info4Analisis ? informesAnalisis.push(info4Analisis) : false;

    res.render('empresa/analisis', {
        user_dash: true, pagoDiag: true,
        actualYear: req.actualYear,
        informe: false, propuesta, btnPagar,
        etapa1, archivos,
        informesAnalisis,
        escena1, escena2,
        escena3, escena4,
        escena5, escena6,
        msgActivo, msgDesactivo, msgDesactivo2, msgDesactivo3, activarPagoUnico,
        btnActivo, btnDesactivo, tienePropuesta,
        itemAnalisis: true,
        consulAsignado: req.session.consulAsignado,
        etapaCompleta: req.session.etapaCompleta, modalAcuerdo, id_empresa
    })
}

/****************************************************************
 * GUARDAR ARCHIVOS SOLICITADOS POR EL CONSULTOR
*/
empresaController.guardarArchivos = async (req, res) => {
    const { id, empresa, etapa, tabla } = req.body;
    let info = await consultarDatos('consultores_asignados')
    let link = ''
    let linkEmail = ''
    let txtEtapa = ''
    if (etapa == 2) {
        link = '../archivos_analisis_empresa/Análisis-de-negocio_'+req.file.originalname;
        linkEmail = 'analisis-de-negocio';
        txtEtapa = 'Análisis de negocio'
        info = info.find(x => x.empresa == empresa && x.orden == 2)
        const consultores = await consultarDatos('consultores')
        info = consultores.find(x => x.id_consultores == info.consultor)
    } else if (etapa == 3) {
        link = '../archivos_empresarial_empresa/Proyecto-de-consultoría_'+req.file.originalname;
        linkEmail = 'proyecto-de-consultoria';
        txtEtapa = 'Proyecto de consultoría'
        info = info.find(x => x.empresa == empresa && x.orden == 3)
        const consultores = await consultarDatos('consultores')
        info = consultores.find(x => x.id_consultores == info.consultor)
    } else {
        link = '../archivos_estrategico_empresa/Plan-estratégico_'+req.file.originalname;
        linkEmail = 'plan-estrategico';
        txtEtapa = 'Plan estratégico'
        info = info.find(x => x.empresa == empresa && x.orden == 4)
        const consultores = await consultarDatos('consultores')
        info = consultores.find(x => x.id_consultores == info.consultor)
    }
    let result = await cargarArchivo(id, empresa, link, tabla)
    if (result) {
        result = {ok:true,url:link}

        const nombreConsultor = info.nombres + ' ' + info.apellidos;
        let e = await consultarDatos('empresas')
        e = e.find(x => x.id_empresas == empresa)
        const nombreEmpresa = e.nombre_empresa;
        // Obtener la plantilla de Email
        const template = archivosCargadosHTML(nombreConsultor, nombreEmpresa, txtEtapa, linkEmail)
        // Enviar Email
        const resultEmail = await sendEmail(info.email, 'Una empresa ha cargado un archivo nuevo', template)

        if (resultEmail == false) {
            console.log("\n*_*_*_*_*_* Ocurrio un error inesperado al enviar el email de Archivo Cargado *_*_*_*_*_* \n");
        } else {
            console.log(`\n>>>> Email de Archivo cargado - ENVIADO a => ${info.email} <<<<<\n`)
            respuesta = true;
        }
    }
    res.send(result)
}

/************************************************************************* */

/** PLAN EMPRESARIAL + LISTADO DE TAREAS DEL CONSULTOR */
empresaController.planEmpresarial = async (req, res) => {
    const btnPagar = {};
    const fechaActual = new Date().toLocaleDateString('fr-CA');
    const row = await consultarDatos('empresas', `WHERE email = "${req.user.email}" LIMIT 1`)
    const id_empresa = row[0].id_empresas;
    const propuestas = await consultarDatos('propuestas')
    const propuesta = propuestas.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Proyecto de Consultoría')
    const pagos = await consultarDatos('pagos')
    const pago_empresa = pagos.find(i => i.id_empresa == id_empresa)
    const etapa2 = {lista: true}

    // PROCESO PARA LAS TAREAS DEL CONSULTOR (PLAN EMPRESARIAL)
    const tareas = await consultarTareasEmpresarial(id_empresa, fechaActual)

    /************************************************************************************* */
    let escena1 = false, escena2 = false, escena3 = false, escena4 = false, escena5 = false, escena6 = false, activarPagoUnico = true,
    msgActivo, msgDesactivo, msgDesactivo2 = true, msgDesactivo3 = true,
    btnActivo = "background: #85bb65;margin: 0 auto;border-color: #85bb65;", 
    btnDesactivo = "background: #656c73;margin: 0 auto;border-color: #656c73;"
    /************************************************************************************* */

    // PROPUESTA DE PLAN EMPRESARIAL
    let tienePropuesta = false
    if (propuesta) {
        tienePropuesta = true
        btnPagar.etapa1 = false;
        btnPagar.activar1 = false;
        btnPagar.etapa2 = true;
        btnPagar.activar2 = true;
        propuesta.pagada = false;
        
        /************************************************************************************* */
        let fechaEmpresarial = JSON.parse(pago_empresa.empresarial1)
        fechaEmpresarial = fechaEmpresarial.fecha
        let fechaDB = new Date(fechaEmpresarial)
        let fechaDB2 = new Date(fechaEmpresarial)
        
        if (msgDesactivo2) {
            fechaDB.setDate(fechaDB2.getDate() + 30);
            fechaDB = fechaDB.toLocaleDateString("en-US")
            msgDesactivo2 = "Pago disponible apartir de: "+fechaDB+""
        }

        if (msgDesactivo3) {
            fechaDB2.setDate(fechaDB2.getDate() + 60);
            fechaDB2 = fechaDB2.toLocaleDateString("en-US")
            msgDesactivo3 = "Pago disponible apartir de: "+fechaDB2+""
        }
        /************************************************************************************* */

        const objEmpresarial = JSON.parse(pago_empresa.empresarial0)
        const objEmpresarial1 = JSON.parse(pago_empresa.empresarial1)
        const objEmpresarial2 = JSON.parse(pago_empresa.empresarial2)
        const objEmpresarial3 = JSON.parse(pago_empresa.empresarial3)

        btnPagar.obj1 = parseInt(objEmpresarial1.estado)
        btnPagar.obj2 = parseInt(objEmpresarial2.estado)
        btnPagar.obj3 = parseInt(objEmpresarial3.estado)
        
        // PAGÓ EL PLAN EMPRESARIAL
        if (objEmpresarial.estado == 1 ) {
            btnPagar.etapa1 = false;
            btnPagar.activar1 = false;
            btnPagar.etapa2 = true;
            btnPagar.activar2 = false;
            propuesta.pagada = true;
            btnPagar.empresarialPer = true
            propuesta.precio_total = objEmpresarial.precio;

            escena6 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Proyecto de consultoría pagado"
            msgDesactivo2 = "Proyecto de consultoría pagado"
            msgDesactivo3 = "Proyecto de consultoría pagado"
        } else if  (objEmpresarial1.estado == 1 && objEmpresarial2.estado == 0 && objEmpresarial3.estado == 0) {
            escena1 = true
            msgActivo = "Primera cuota lista para pagarse"
            btnActivo  
            msgDesactivo = "Pago no disponible aun"
            btnDesactivo
        } else if (objEmpresarial1.estado != 1 && objEmpresarial2.estado == 0 && objEmpresarial3.estado == 0){
            escena2 = true
            activarPagoUnico = false
            msgDesactivo = "Primera cuota pagada"
            msgDesactivo2
            msgDesactivo3 
            btnDesactivo
        } else if (objEmpresarial1.estado == 2 && objEmpresarial2.estado == 1 && objEmpresarial3.estado == 0) {
            escena3 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Primera cuota pagada"
            msgActivo = "Segunda cuota lista para pagarse"
            btnActivo 
            msgDesactivo3
        } else if (objEmpresarial1.estado== 2 && objEmpresarial2.estado == 2 && objEmpresarial3.estado == 0) {
            escena4 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Primera cuota pagada"
            msgDesactivo2 = "Segunda cuota pagada"
            msgDesactivo3
        } else if (objEmpresarial1.estado == 2 && objEmpresarial2.estado == 2 && objEmpresarial3.estado == 1) {
            escena5 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Primera cuota pagada"
            msgDesactivo2 = "Segunda cuota pagada"
            msgActivo = "Tercera cuota lista para pagarse"
            btnActivo
        } else if (objEmpresarial1.estado == 2 && objEmpresarial2.estado == 2 && objEmpresarial3.estado == 2) {
            escena6 = true
            activarPagoUnico = false
            btnDesactivo
            msgDesactivo = "Primera cuota pagada"
            msgDesactivo2 = "Segunda cuota pagada"
            msgDesactivo3 = "Tercera cuota pagada"
        }

        if (objEmpresarial1.estado == 2) {
            btnPagar.etapa1 = false;
            btnPagar.activar1 = false;
            btnPagar.etapa2 = true;
            btnPagar.activar2 = true;
            btnPagar.empresarialPer = true;
            propuesta.porcentaje = "60%";
        }
        if (objEmpresarial2.estado == 2) {propuesta.porcentaje = "80%";}
        if (objEmpresarial3.estado == 2) {propuesta.porcentaje = true}

    }

    /************************************************************************************* */
    // ARCHIVOS CARGADOS
    let archivos = await consultarDatos('archivos_empresarial')
    archivos = archivos.filter(i => i.empresa == id_empresa)
    if (archivos.length > 0) {
        archivos.forEach(x => {
            x.estado = 'Pendiente';
            x.color = 'warning';
            x.display = 'none';
            if (x.link != null) {
                x.estado = 'Cargado';
                x.color = 'success';
                x.display = 'block';
            }
        })
    } else {
        archivos = false;
    }
    /************************************************************************************* */
    
    res.render('empresa/planEmpresarial', {
        user_dash: true, pagoDiag: true,
        actualYear: req.actualYear,
        propuesta, btnPagar, etapa2, archivos,        
        escena1, escena2, escena3, escena4, escena5, escena6, 
        msgActivo, msgDesactivo, msgDesactivo2, msgDesactivo3, activarPagoUnico, btnActivo, btnDesactivo, tienePropuesta,
        consulAsignado: req.session.consulAsignado,
        etapaCompleta: req.session.etapaCompleta,
        itemEmpresarial: true, tareas, modalAcuerdo, id_empresa
    })
}

/** PLAN ESTRATÉGICO DE NEGOCIO - LISTADOD DE TAREAS + GRÁFICAS */
empresaController.planEstrategico = async (req, res) => {
    let empresa = await consultarDatos('empresas', `WHERE email = "${req.user.email}" LIMIT 1`)
    empresa = empresa[0].id_empresas
    const fechaActual = new Date().toLocaleDateString('fr-CA');
    let subCancelada = false;

    const dimObj = await tareasGenerales(empresa, fechaActual)
    const tareas = dimObj.tareas;

    const informePlan = await consultarInformes(empresa, "Informe de plan estratégico")
    let datosTabla = await consultarDatos('rendimiento_empresa')
    datosTabla = datosTabla.filter(x => x.empresa == empresa)
    const jsonRendimiento = JSON.stringify(datosTabla)

    // PROPUESTA DE PLAN ESTRATÉGICO
    const botones = {}
    let propuesta = await consultarDatos('propuestas')
    propuesta = propuesta.find(i => i.empresa == empresa && i.tipo_propuesta == 'Plan estratégico')
    let pagos = await consultarDatos('pagos')
    pagos = pagos.find(i => i.id_empresa == empresa)
    let tienePropuesta = false
    if (propuesta) {
        tienePropuesta = true
        botones.pagar = true;
        botones.editSub = false;
        propuesta.color = 'warning';
        propuesta.texto = 'Pendiente';
        propuesta.pagada = false;
        const objEstrategico = JSON.parse(pagos.estrategico)

        if (objEstrategico.estado == 1) {
            propuesta.color = 'success';
            propuesta.texto = 'Completado';
            propuesta.pagada = true;
        }

        /** VALIDANDO ESTADO DE LA SUBSCRIPCIÓN - POR SI RENUEVA O NO LA SUB */
        let id_sub = null;
        let subscription = null;        
        if (objEstrategico.subscription) {
            id_sub = objEstrategico.subscription;
            subscription = await stripe.subscriptions.retrieve(id_sub);
            if (subscription.cancel_at != null) {
                propuesta.fechaCancelacion = new Date(subscription.cancel_at*1000).toLocaleDateString('en-US');
            } else {
                propuesta.fechaCancelacion = false;
            }
            console.log("\n>>> DATA SUBSCRIPTION: ", subscription)
            console.log('\n*******************\n');
            if (subscription.status == 'active' && !subscription.cancel_at_period_end && subscription.cancel_at != null) {
                propuesta.color = 'success';
                propuesta.texto = 'Activa';
                botones.pagar = false;
                botones.editSub = true;
                propuesta.pagada = true;
            } else if (subscription.status == 'active' && subscription.cancel_at_period_end && subscription.cancel_at != null) {
                propuesta.color = 'secondary';
                propuesta.texto = 'Pendiente por cancelar';
                botones.pagar = false;
                botones.editSub = true;
                propuesta.pagada = true;
            } else if (subscription.status == 'active' && !subscription.cancel_at_period_end && subscription.cancel_at == null) {
                propuesta.color = 'info';
                propuesta.texto = 'Pendiente por renovar';
                botones.pagar = false;
                botones.editSub = true;
                propuesta.pagada = true;
            } else {
                propuesta.color = 'danger';
                propuesta.texto = 'Cancelada';
                botones.pagar = false;
                botones.editSub = false;
                subCancelada = true;
            }
        }
        
    }

    /************************************************************************************* */
    // ARCHIVOS CARGADOS
    let archivos = await consultarDatos('archivos_estrategico')
    archivos = archivos.filter(i => i.empresa == empresa)
    if (archivos.length > 0) {
        archivos.forEach(x => {
            x.estado = 'Pendiente';
            x.color = 'warning';
            x.display = 'none';
            if (x.link != null) {
                x.estado = 'Cargado';
                x.color = 'success';
                x.display = 'block';
            }
        })
    } else {
        archivos = false;
    }
    /************************************************************************************* */

    res.render('empresa/planEstrategico', {
        user_dash: true, pagoDiag: true,
        actualYear: req.actualYear, botones,
        tareas, informePlan, propuesta,
        dimObj, jsonRendimiento, tienePropuesta,
        itemEstrategico: true,
        consulAsignado: req.session.consulAsignado,
        etapaCompleta: req.session.etapaCompleta,
        subCancelada, modalAcuerdo, portalClientes, archivos, empresa
    })
}