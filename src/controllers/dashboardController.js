const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')
const helpers = require('../lib/helpers')
const crypto = require('crypto');
const { consultorAsignadoHTML, consultorAprobadoHTML, sendEmail } = require('../lib/mail.config')

let aprobarConsultor = false;

// Dashboard Administrativo
dashboardController.admin = async (req, res) => {
    const consultores = await pool.query('SELECT * FROM consultores WHERE id_consultores != 1 ORDER BY id_consultores DESC LIMIT 2')
    const empresas = await pool.query('SELECT * FROM empresas ORDER BY id_empresas DESC LIMIT 2')
    
    /** Acceso directo para Consultores pendientes por aprobar */
    aprobarConsultor = false;
    const pendientes = await pool.query('SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Consultor" AND estadoAdm = 0 ORDER BY id_usuarios ASC;')
    pendientes.length > 0 ? aprobarConsultor = pendientes[0].codigo : aprobarConsultor = aprobarConsultor;
    
    const consultorAsignado = await pool.query('SELECT * FROM consultores')

    empresas.forEach(e => {
        consultorAsignado.forEach(c => {
            if (e.consultor == c.id_consultores){
                e.nombre_consultor = c.nombres + " " + c.apellidos;
            }
        })
    });

    res.render('panel/panelAdmin', { adminDash: true, itemActivo: 1, consultores, empresas, aprobarConsultor });
}

// CONSULTORES
dashboardController.registroConsultores = (req, res) => {
    res.render('auth/registroConsultor', { wizarx: true, csrfToken: req.csrfToken() })
}

dashboardController.addConsultores = (req, res, next) => {
    passport.authenticate('local.registroConsultores', {
        successRedirect: '/registro-de-consultores',
        failureRedirect: '/registro-de-consultores',
        failureFlash: true
    })(req, res, next)
}

dashboardController.mostrarConsultores = async (req, res) => {
    let consultores = await pool.query('SELECT c.*, u.codigo, u.estadoAdm FROM consultores c JOIN users u ON c.codigo = u.codigo AND rol = "Consultor" AND c.id_consultores != 1;')

    consultores.forEach(async c => {
        const num = await pool.query('SELECT COUNT(*) AS numEmpresas FROM empresas WHERE consultor = ?', [c.id_consultores])
        c.num_empresas = num[0].numEmpresas
    });

    /** Acceso directo para Consultores pendientes por aprobar */
    aprobarConsultor = false;
    const pendientes = await pool.query('SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Consultor" AND estadoAdm = 0 ORDER BY id_usuarios ASC;')
    pendientes.length > 0 ? aprobarConsultor = pendientes[0].codigo : aprobarConsultor = aprobarConsultor;

    res.render('panel/mostrarConsultores', { adminDash: true, itemActivo: 2, consultores, aprobarConsultor })
}

dashboardController.editarConsultor = async (req, res) => {
    const codigo = req.params.codigo
    let consultor = await pool.query('SELECT c.*, u.codigo, u.estadoAdm, u.rol FROM consultores c LEFT OUTER JOIN users u ON c.codigo = ? AND c.codigo = u.codigo AND u.rol = "Consultor";', [codigo])
    consultor = consultor[0];
    if (consultor.certificado) {
        consultor.txtCertificado = consultor.certificado.split('/')[2]
    }
    res.render('panel/editarConsultor', { adminDash: true, itemActivo: 2, consultor, formEdit: true, aprobarConsultor })
}

dashboardController.actualizarConsultor = async (req, res) => {
    const { codigo, estado, usuario_calendly } = req.body;
    const nuevoEstado = { estadoAdm: estado } // Estado Consultor Aprobado, Pendiente, Bloqueado
    const urlCalendly = {usuario_calendly} // URL Calendly
    const c1 = await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"', [nuevoEstado, codigo])
    const c2 = await pool.query('UPDATE consultores SET ? WHERE codigo = ?', [urlCalendly, codigo])
    const c = await pool.query('SELECT * FROM users WHERE codigo = ? AND rol = "Consultor"', [codigo]) // Consultando Consultor Aprobado
    let respuesta = false;

    if (c1.affectedRows > 0){
        
        // Enviando Email - Consultor Aprobado
        if (c.length > 0 && c[0].estadoAdm == 1){
            const nombre = c[0].nombres + " " + c[0].apellidos;
            const email = c[0].email

            console.log("\nINFO CONSULTOR >>>\n", c);

            // Generar código MD5 con base a su email (Esta es la clave del Consultor)
            let codigo = crypto.createHash('md5').update(email).digest("hex");
            const clave = codigo.slice(5, 13);

            console.log("\n<<<< Clave del Consultor: ", clave);

            // Obtener la plantilla de Email
            const template = consultorAprobadoHTML(nombre, clave);
        
            // Enviar Email
            const resultEmail = await sendEmail(email, 'Has sido aprobado como consultor en 3C Sigma', template)

            if (resultEmail == false){
                res.json("Ocurrio un error inesperado al enviar el email de Consultor Asignado")
            } else {
                console.log("\n>>>> Email de Consultor Aprobado - ENVIADO <<<<<\n")
                respuesta = true;
            }
        }

    } 

    if(c2.affectedRows > 0) {
        respuesta = true;
    }

    res.send(respuesta)
}

dashboardController.bloquearConsultor = async (req, res) => {
    const { id } = req.body
    let respu = false;
    const actualizar = {estadoAdm: 2}
    const consultor = await pool.query('SELECT id_consultores, codigo FROM consultores WHERE id_consultores = ? LIMIT 1', [id])
    if (consultor.length > 0) {
        const c = await pool.query('SELECT * FROM users WHERE codigo = ? AND rol = "Consultor"', [consultor[0].codigo])
        if (c.length > 0 && c[0].estadoAdm == 2) {
            res.send(respu)
        } else{
            await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"', [actualizar, consultor[0].codigo], (err, result) => {
                if (err) throw err;
                if (result.affectedRows > 0){ respu = true }
                res.send(respu)
            })
        }
    }
}

// EMPRESAS
dashboardController.mostrarEmpresas = async (req, res) => {
    let empresas = await pool.query('SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.id_empresa, p.diagnostico_negocio, p.analisis_negocio, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa";')

    const consultor = await pool.query('SELECT * FROM consultores')

    empresas.forEach(e => {
        e.etapa = 'Email sin confirmar';
        e.estadoEmail == 1 ? e.etapa = 'Email confirmado' : e.etapa = e.etapa;
        e.diagnostico_negocio == 1 ? e.etapa = 'Diagnóstico pagado' : e.etapa = e.etapa;
        e.analisis_negocio == 1 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;
        e.estadoAcuerdo == 2 ? e.etapa = 'Acuerdo firmado' : e.etapa = e.etapa;
        e.consultor ? e.etapa = 'Consultor asignado' : e.etapa = e.etapa;

        consultor.forEach(c => {
            if (e.consultor == c.id_consultores){
                e.nombre_consultor = c.nombres + " " + c.apellidos;
                e.codigo_consultor = c.codigo
            }
        })

    });

    res.render('panel/mostrarEmpresas', { adminDash: true, itemActivo: 3, empresas, aprobarConsultor })
}

dashboardController.editarEmpresa = async (req, res) => {
    const codigo = req.params.codigo, datos = {};
    let consultores = null, c1, c2;

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
        // empresa.userConsultor != null ? datos.etapa = 'Consultor asignado' : datos.etapa = datos.etapa;

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

    // CAPTURANDO CONSULTOR ASIGNADO A LA EMPRESA DE
    const consulAsignado = await pool.query('SELECT * FROM consultores WHERE id_consultores = ?', [filas.consultor])
    let idConsultor = '';
    if (consulAsignado.length > 0) {
        idConsultor = consulAsignado[0].id_consultores;
        empresa.nomConsul = consulAsignado[0].nombres + " " + consulAsignado[0].apellidos;
    }

    consultores = await pool.query('SELECT c.*, u.codigo, u.estadoAdm, u.rol FROM consultores c INNER JOIN users u ON u.estadoAdm = 1 AND c.codigo = u.codigo AND u.rol != "Empresa"')
    consultores.forEach(cs => {
        cs.idCon = idConsultor;
    });

    const frmDiag = {}
    let diagnostico = await pool.query('SELECT * FROM diagnostico_empresas WHERE id_empresa = ? AND id_consultor = ?', [idUser, idConsultor])
    if (diagnostico.length == 0){
        frmDiag.color = 'badge-danger'
        frmDiag.texto = 'Pendiente'
        frmDiag.fechaLocal = true;
    } else{
        frmDiag.color = 'badge-success'
        frmDiag.estilo = 'linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%); color: #FFFF'
        frmDiag.texto = 'Completado'
        frmDiag.estado = true;
    }

    /************** DATOS PARA LAS GRÁFICAS AREAS VITALES & POR DIMENSIONES ****************/
    let jsonAnalisis1 = null, jsonAnalisis2 = null;
    let areasVitales = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ LIMIT 2', [idUser])

    if (areasVitales.length > 0) {
        jsonAnalisis1 = JSON.stringify(areasVitales[0]);
        jsonAnalisis2 = JSON.stringify( areasVitales[1]);
    }

    /************************************************************************************* */

    res.render('panel/editarEmpresa', { 
        adminDash: true, itemActivo: 3, empresa, formEdit: true, datos, consultores, aprobarConsultor, frmDiag,
        jsonAnalisis1, jsonAnalisis2
    })

}

dashboardController.actualizarEmpresa = async (req, res) => {
    const { codigo, id_consultor, estadoAdm } = req.body;
    let consul = { consultor: id_consultor };
    console.log("\n <<< DATOS CAPTURADOS PARA ACTUALIZAR EMPRESA >>>", req.body);

    // Asignando y/o actualizando consultor a la empresa
    if (id_consultor == '' || id_consultor == null) { consul.consultor = null }
    const asignado = await pool.query('UPDATE empresas SET ? WHERE codigo = ?', [consul, codigo])
    const e = await pool.query('SELECT * FROM empresas WHERE codigo = ?', [codigo])

    // Proceso de email de consultor asignado
    if (asignado.affectedRows > 0){
        
        if (e.length > 0 && e[0].consultor != null){

            const nombre = e[0].nombre_empresa;
            const email = e[0].email
            
            // Obtener la plantilla de Email
            const template = consultorAsignadoHTML(nombre);
    
            // Enviar Email
            const resultEmail = await sendEmail(email, 'Tu consultor ha sido asignado en 3C Sigma', template)

            if (resultEmail == false){
                res.json("Ocurrio un error inesperado al enviar el email de Consultor Asignado")
            } else {
                console.log("Email de Consultor Asignado enviado")
            }

            
        }
    }

    // Cambiando estado de la cuenta de la empresa (Activa o Bloqueada)
    const estado = { estadoAdm }
    await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Empresa"', [estado, codigo], (err, result) => {
        if (err) throw err;
        console.log("estado adm empresa >>>", result)
        res.redirect('/empresas')
    })

}

dashboardController.bloquearEmpresa = async (req, res) => {
    const { id } = req.body
    let respu = false;
    const actualizar = {estadoAdm: 0}
    const empresa = await pool.query('SELECT id_empresas, codigo FROM empresas WHERE id_empresas = ? LIMIT 1', [id])
    if (empresa.length > 0) {
        const e = await pool.query('SELECT * FROM users WHERE codigo = ?  AND rol = "Empresa"', [empresa[0].codigo])
        if (e.length > 0 && e[0].estadoAdm == 0) {
            res.send(respu)
        } else{
            await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Empresa"', [actualizar, empresa[0].codigo], (err, result) => {
                if (err) throw err;
                if (result.affectedRows > 0){ respu = true }
                res.send(respu)
            })
        }
    }
}

// CUESTIONARIO DIAGNÓSTICO DE NEGOCIO EXCEL
dashboardController.cuestionario = async (req, res) => {
    const { codigo } = req.params;
    // const e = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigo])
    // let row = await pool.query('SELECT * FROM diagnostico_empresas WHERE id_empresa = ? LIMIT 1', [e.id_empresas])
    // row = row[0]
    res.render('consultor/cuestionario', {wizarx: true, user_dash: false, adminDash: false, codigo })
}

dashboardController.enviarCuestionario = async (req, res) => {
    // Capturar ID Empresa
    const { codigoEmpresa } = req.body;
    const infoEmp = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigoEmpresa])
    const id_empresa = infoEmp[0].id_empresas;

    // Capturar ID Consultor
    const id_consultor = infoEmp[0].consultor;

    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: fecha_zh })

    // Productos o Servicios
    const { necesidad_producto, precio_producto, productos_coherentes, calidad_producto, presentacion_producto, calificacion_global_producto } = req.body
    let productos_servicios = JSON.stringify({
        necesidad_producto, precio_producto, productos_coherentes, calidad_producto, presentacion_producto, calificacion_global_producto 
    })

    // Administración
    const { planeacion_estrategica, analisis_foda, estructura_organizativa, sistema_administrativo, facturacion_automatizada, calificacion_administracion } = req.body
    let administracion = JSON.stringify({ 
        planeacion_estrategica, analisis_foda, estructura_organizativa, sistema_administrativo, facturacion_automatizada, calificacion_administracion
    })

    // Talento Humano
    const { principales_funciones_personal, programa_formacion_colab, habilidades_colab, medicion__personal, personal_capacitado, proceso_contratacion, calificacion_personal_laboral } = req.body
    let talento_humano = JSON.stringify({
        principales_funciones_personal, programa_formacion_colab, habilidades_colab, medicion__personal, personal_capacitado, proceso_contratacion, calificacion_personal_laboral
    })

    // Finanzas
    const { proyeccion_ventas, estructura_costos, cuentas_pagar_cobrar, costos_fijos_variables, analisis_finanzas_anual, utilidad_neta, empresa_rentable, punto_equilibrio, recuperar_inversion, mejorar_rentabilidad, calificacion_finanzas } = req.body
    let finanzas = JSON.stringify({
        proyeccion_ventas, estructura_costos, cuentas_pagar_cobrar, costos_fijos_variables, analisis_finanzas_anual, utilidad_neta, empresa_rentable, punto_equilibrio, recuperar_inversion, mejorar_rentabilidad, calificacion_finanzas
    })

    // Servicio al Cliente
    const { clientes_info_productos, satisfaccion_clientes_productos, necesidades_clientes_productos, mecanismo_quejas_reclamos, estrategias_fidelidad_clientes, calificacion_servicio_alcliente } = req.body
    let servicio_alcliente = JSON.stringify({
        clientes_info_productos, satisfaccion_clientes_productos, necesidades_clientes_productos, mecanismo_quejas_reclamos, estrategias_fidelidad_clientes, calificacion_servicio_alcliente
    })

    // Operaciones
    const { instalaciones_adecuadas, permisos_requeridos, plan_detrabajo, tiempos_entrega_productos, estandarizacion_procesos_op, calificacion_operaciones_procesos } = req.body
    let operaciones = JSON.stringify({
        instalaciones_adecuadas, permisos_requeridos, plan_detrabajo, tiempos_entrega_productos, estandarizacion_procesos_op, calificacion_operaciones_procesos
    })

    // Ambiente Laboral
    const { ambienteLab_positivo, medicion_ambienteLab, agrado_empleados, comunicacion_efectiva, comunicar_buen_trabajo, califacion_ambienteLab } = req.body
    let ambiente_laboral = JSON.stringify({
        ambienteLab_positivo, medicion_ambienteLab, agrado_empleados, comunicacion_efectiva, comunicar_buen_trabajo, califacion_ambienteLab
    })

    // Innovación
    const { aportan_ideas, incrementar_ventas, procesos_innovadores, modelo_innovador, empresa_innovadora, calificacion_innovacion } = req.body
    let innovacion = JSON.stringify({
        aportan_ideas, incrementar_ventas, procesos_innovadores, modelo_innovador, empresa_innovadora, calificacion_innovacion
    })

    // Marketing
    const { estudio_mercado, segmento_mercado, posicionamiento_mercado, estrategias_marketing, plan_marketing, pagina_web_promover, redes_sociales_promover, manual_identidad, tiene_eslogan, brochure_empresa, calificacion_marketing } = req.body
    let marketing = JSON.stringify({
        estudio_mercado, segmento_mercado, posicionamiento_mercado, estrategias_marketing, plan_marketing, pagina_web_promover, redes_sociales_promover, manual_identidad, tiene_eslogan, brochure_empresa, calificacion_marketing
    })

    // Ventas
    const { ventas_conFacilidad, calificacion_productos_meses, plan_ventas, estrategia_ventas, canales_ventas, calificacion_ventas } = req.body
    let ventas = JSON.stringify({
        ventas_conFacilidad, calificacion_productos_meses, plan_ventas, estrategia_ventas, canales_ventas, calificacion_ventas
    })

    // Fortalezas
    const { f1, f2, f3, f4, f5 } = req.body
    let fortalezas = JSON.stringify({
        f1, f2, f3, f4, f5
    })

    // Oportunidades de Mejora
    const { o1, o2, o3, o4, o5 } = req.body
    let oportunidades_mejoras = JSON.stringify({
        o1, o2, o3, o4, o5
    })

    // Metas a corto plazo
    const { m1, m2, m3, m4, m5 } = req.body
    let metas_corto_plazo = JSON.stringify({
        m1, m2, m3, m4, m5
    })

    // Creando Objetos para guardar en la base de datos
    const nuevoDiagnostico = { id_empresa, id_consultor, fecha, productos_servicios, administracion, talento_humano, finanzas, servicio_alcliente, operaciones, ambiente_laboral, innovacion, marketing, ventas, fortalezas, oportunidades_mejoras, metas_corto_plazo }

    const areasVitales = { id_empresa,
        calificacion_global_producto, 
        calificacion_administracion, 
        calificacion_personal_laboral, 
        calificacion_finanzas, 
        calificacion_servicio_alcliente, calificacion_operaciones_procesos, 
        califacion_ambienteLab, 
        calificacion_innovacion, 
        calificacion_marketing,
        calificacion_ventas
    }


    // Guardando en la Base de datos
    await pool.query('INSERT INTO diagnostico_empresas SET ?', [nuevoDiagnostico], (err, result) => {
        if (err) throw err;
        if (result.affectedRows > 0) {
            res.redirect('/empresas/'+codigoEmpresa)
        }
    })

}