const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const { consultarInformes, consultarTareas, consultarDatos } = require('../lib/helpers')

const { sendEmail, consultorAsignadoHTML, consultorAprobadoHTML, informesHTML, etapaFinalizadaHTML  } = require('../lib/mail.config');
const { request } = require('http');

let aprobarConsultor = false;

// Dashboard Administrativo
dashboardController.admin = async (req, res) => {
    const consultores = await pool.query('SELECT * FROM consultores WHERE id_consultores != 1 ORDER BY id_consultores DESC LIMIT 2')
    const empresas = await pool.query('SELECT * FROM empresas ORDER BY id_empresas DESC LIMIT 2')

    /** Acceso directo para Consultores pendientes por aprobar */
    aprobarConsultor = false;
    const pendientes = await pool.query('SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Consultor" AND estadoAdm = 0 ORDER BY id_usuarios ASC;')
    pendientes.length > 0 ? aprobarConsultor = pendientes[0].codigo : aprobarConsultor = aprobarConsultor;

    const consultorAsignado = await consultarDatos('consultores')
    const ficha = await consultarDatos('ficha_cliente')

    empresas.forEach(e => {
        consultorAsignado.forEach(c => {
            if (e.consultor == c.id_consultores) {
                e.nombre_consultor = c.nombres + " " + c.apellidos;
            }
        })

        // e.ficha = false;
        ficha.forEach(f => {
            if (f.id_empresa == e.id_empresas) {
                e.ficha = true;
            }
        });
    });

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE CONSULTORES REGISTRADOS MENSUALMENTE <<====
    let historialConsultores = await pool.query("SELECT * FROM (SELECT * FROM historial_consultores_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;");
    let datosJson_historialC_adm
    if (historialConsultores.length > 0) {
        datosJson_historialC_adm = JSON.stringify(historialConsultores);
        console.log("\n");
        console.log("IMPIMIENDO datosJson_historialC_adm ====>>>", datosJson_historialC_adm);
    }
    // FIN DE LA FUNCIÓN <<====

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE EMPRESAS REGISTRADOS MENSUALMENTE <<====
    let historialEmpresas = await pool.query("SELECT * FROM (SELECT * FROM historial_empresas_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;");
    let datosJson_historialE_adm
    if (historialEmpresas.length > 0) {
        datosJson_historialE_adm = JSON.stringify(historialEmpresas);
        console.log("\n");
        console.log("IMPIMIENDO datosJson_historialE_adm ====>>>", datosJson_historialE_adm);
    }
    // FIN DE LA FUNCIÓN <<====

    // MOSTRAR DATOS PARA LA GRAFICA NUMERO DE INFORMES REGISTRADOS MENSUALMENTE <<====
    let historialInformes = await pool.query("SELECT * FROM (SELECT * FROM historial_informes_admin ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC;");
    let datosJson_historialI_adm
    if (historialInformes.length > 0) {
        datosJson_historialI_adm = JSON.stringify(historialInformes);
        console.log("\n");
        console.log("IMPIMIENDO datosJson_historialI_adm ====>>>", datosJson_historialI_adm);
    }
    // FIN DE LA FUNCIÓN <<====

    res.render('admin/panelAdmin', { adminDash: true, itemActivo: 1, consultores, empresas, aprobarConsultor, graficas1: true, datosJson_historialC_adm, datosJson_historialE_adm, datosJson_historialI_adm });

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
    let consultores = await pool.query('SELECT c.*, u.codigo, u.foto, u.estadoAdm FROM consultores c JOIN users u ON c.codigo = u.codigo AND rol = "Consultor" AND c.id_consultores != 1;')

    consultores.forEach(async c => {
        const num = await pool.query('SELECT COUNT(*) AS numEmpresas FROM empresas WHERE consultor = ?', [c.id_consultores])
        c.num_empresas = num[0].numEmpresas
    });

    /** Acceso directo para Consultores pendientes por aprobar */
    aprobarConsultor = false;
    const pendientes = await pool.query('SELECT id_usuarios, codigo, estadoAdm FROM users WHERE rol = "Consultor" AND estadoAdm = 0 ORDER BY id_usuarios ASC;')
    pendientes.length > 0 ? aprobarConsultor = pendientes[0].codigo : aprobarConsultor = aprobarConsultor;

    res.render('admin/mostrarConsultores', { adminDash: true, itemActivo: 2, consultores, aprobarConsultor })
}

dashboardController.editarConsultor = async (req, res) => {
    const codigo = req.params.codigo
    let consultor = await pool.query('SELECT c.*, u.codigo, u.estadoAdm, u.rol FROM consultores c LEFT OUTER JOIN users u ON c.codigo = ? AND c.codigo = u.codigo AND u.rol = "Consultor";', [codigo])
    consultor = consultor[0];
    if (consultor.certificado) {
        consultor.txtCertificado = consultor.certificado.split('/')[2]
    }
    res.render('admin/editarConsultor', { adminDash: true, itemActivo: 2, consultor, formEdit: true, aprobarConsultor })
}

dashboardController.actualizarConsultor = async (req, res) => {
    const { codigo, estado, usuario_calendly } = req.body;
    const nuevoEstado = { estadoAdm: estado } // Estado Consultor Aprobado, Pendiente, Bloqueado
    const urlCalendly = { usuario_calendly } // URL Calendly
    const c1 = await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"', [nuevoEstado, codigo])
    const c2 = await pool.query('UPDATE consultores SET ? WHERE codigo = ?', [urlCalendly, codigo])
    const c = await pool.query('SELECT * FROM users WHERE codigo = ? AND rol = "Consultor"', [codigo]) // Consultando Consultor Aprobado
    let respuesta = false;

    if (c1.affectedRows > 0) {

        // Enviando Email - Consultor Aprobado
        if (c.length > 0 && c[0].estadoAdm == 1) {
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

            if (resultEmail == false) {
                res.json("Ocurrio un error inesperado al enviar el email de Consultor Asignado")
            } else {
                console.log("\n>>>> Email de Consultor Aprobado - ENVIADO <<<<<\n")
                respuesta = true;
            }
        }

    }

    if (c2.affectedRows > 0) {
        respuesta = true;
    }

    res.send(respuesta)
}

dashboardController.bloquearConsultor = async (req, res) => {
    const { id } = req.body
    let respu = false;
    const actualizar = { estadoAdm: 2 }
    const consultor = await pool.query('SELECT id_consultores, codigo FROM consultores WHERE id_consultores = ? LIMIT 1', [id])
    if (consultor.length > 0) {
        const c = await pool.query('SELECT * FROM users WHERE codigo = ? AND rol = "Consultor"', [consultor[0].codigo])
        if (c.length > 0 && c[0].estadoAdm == 2) {
            res.send(respu)
        } else {
            await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"', [actualizar, consultor[0].codigo], (err, result) => {
                if (err) throw err;
                if (result.affectedRows > 0) { respu = true }
                res.send(respu)
            })
        }
    }
}

// EMPRESAS
dashboardController.mostrarEmpresas = async (req, res) => {
    let empresas = await pool.query('SELECT e.*, u.codigo, u.estadoEmail, u.estadoAdm, f.telefono, f.id_empresa, p.*, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa"')

    const dg_nueva = await consultarDatos('dg_empresa_nueva')
    const dg_establecida = await consultarDatos('dg_empresa_establecida')
    const dg_analisis = await consultarDatos('analisis_empresa')
    const consultor = await consultarDatos('consultores')
    const informe = await consultarDatos('informes')
    const propuestas = await consultarDatos('propuestas')

    empresas.forEach(e => {
        e.pagoEtapa1 = false;
        e.etapa = 'Email sin confirmar';
        e.estadoEmail == 1 ? e.etapa = 'Email confirmado' : e.etapa = e.etapa;
        // e.diagnostico_negocio == 1 ? e.etapa = 'Diagnóstico pagado' : e.etapa = e.etapa;
        // Pago de la Etapa 1 - Diagnóstico de Negocio
        const p1 = JSON.parse(e.diagnostico_negocio)
        if (p1.estado == '1') {
            e.etapa = 'Diagnóstico pagado';
            e.pagoEtapa1 = true;
        } else {
            e.etapa = e.etapa
        }
        e.estadoAcuerdo == 2 ? e.etapa = 'Acuerdo firmado' : e.etapa = e.etapa;
        e.telefono ? e.etapa = 'Ficha cliente' : e.etapa = e.etapa;
        if (dg_nueva.length > 0) {
            const _diag = dg_nueva.find(i => i.id_empresa == e.id_empresas)
            if (_diag) { _diag.consecutivo ? e.etapa = 'Cuestionario empresa nueva' : e.etapa = e.etapa; }
        }

        if (dg_establecida.length > 0) {
            const _diag = dg_establecida.find(i => i.id_empresa == e.id_empresas)
            if (_diag) { _diag.consecutivo ? e.etapa = 'Cuestionario empresa establecida' : e.etapa = e.etapa; }
        }

        let informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe diagnóstico')
        if (informe_empresa) {
            e.etapa = 'Informe diagnóstico';
        }

        /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
        const propuesta = propuestas.find(i => i.empresa == e.id_empresas)
        if (propuesta) { e.etapa = 'Propuesta de análisis enviada' }

        // Pago de la Etapa 2 - Análisis de negocio
        let p2 = JSON.parse(e.analisis_negocio)
        p2.estado == 1 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;
        p2 = JSON.parse(e.analisis_negocio1)
        p2.estado == 2 ? e.etapa = '60% Análisis pagado' : e.etapa = e.etapa;
        p2 = JSON.parse(e.analisis_negocio2)
        p2.estado == 2 ? e.etapa = '80% Análisis pagado' : e.etapa = e.etapa;
        p2 = JSON.parse(e.analisis_negocio3)
        p2.estado == 2 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;

        if (dg_analisis.length > 0) {
            const dim = dg_analisis.find(i => i.id_empresa == e.id_empresas)
            if (dim) { 
                if (dim.producto) e.etapa = 'Cuestionario producto'
                if (dim.administracion) e.etapa = 'Cuestionario administración'
                if (dim.operacion) e.etapa = 'Cuestionario operación'
                if (dim.marketing) e.etapa = 'Cuestionario marketing'
            }
        }

        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de dimensión producto')
        if (informe_empresa) { e.etapa = 'Informe producto'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de dimensión administración')
        if (informe_empresa) { e.etapa = 'Informe administración'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de dimensión operaciones')
        if (informe_empresa) { e.etapa = 'Informe operación'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de dimensión marketing')
        if (informe_empresa) { e.etapa = 'Informe marketing'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de análisis')
        if (informe_empresa) { e.etapa = 'Informe análisis'; }
        informe_empresa = informe.find(i => i.id_empresa == e.id_empresas && i.nombre == 'Informe de plan estratégico')
        if (informe_empresa) { e.etapa = 'Informe plan estratégico'; }

        const consultor_empresa = consultor.find(item => item.id_consultores == e.consultor)
        if (consultor_empresa) {
            e.nombre_consultor = consultor_empresa.nombres + " " + consultor_empresa.apellidos;
            e.codigo_consultor = consultor_empresa.codigo
        }

    });

    res.render('admin/mostrarEmpresas', { adminDash: true, itemActivo: 3, empresas, aprobarConsultor })
}

dashboardController.editarEmpresa = async (req, res) => {
    const codigo = req.params.codigo, datos = {};
    let userEmpresa = await consultarDatos('users')
    userEmpresa = userEmpresa.find(x => x.codigo == codigo && x.rol == 'Empresa')
    // Empresa tabla Usuarios
    let datosEmpresa = await consultarDatos('empresas')
    datosEmpresa = datosEmpresa.find(x => x.codigo == codigo)
    const idEmpresa = datosEmpresa.id_empresas;
    // Empresa tabla Ficha Cliente
    let empresa = await consultarDatos('ficha_cliente')
    empresa = empresa.find(x => x.id_empresa == idEmpresa)

    // Capturando Consultores Activos
    const consultores = await pool.query('SELECT c.*, u.codigo, u.estadoAdm, u.rol FROM consultores c INNER JOIN users u ON u.estadoAdm = 1 AND c.codigo = u.codigo AND u.rol != "Empresa"')

    datos.nombre_completo = datosEmpresa.nombres + " " + datosEmpresa.apellidos;
    datos.nombre_empresa = datosEmpresa.nombre_empresa;
    datos.email = datosEmpresa.email;
    datos.estadoAdm = userEmpresa.estadoAdm;
    datos.code = codigo;
    datos.idEmpresa = idEmpresa
    datos.foto = userEmpresa.foto

    // PAGOS DE LA EMPRESA
    const pagos = await consultarDatos('pagos')
    const pay = pagos.find(i => i.id_empresa == idEmpresa)

    // INFO DE LA EMPRESA HASTA LA FICHA CLIENTE
    if (datosEmpresa) {
        datosEmpresa.estadoEmail == 1 ? datos.etapa = 'Email confirmado' : datos.etapa = datos.etapa;
        datosEmpresa.consultor != null ? datos.etapa = 'Consultor asignado' : datos.etapa = datos.etapa;

        if (pay) {
            const pagoDiagnostico = JSON.parse(pay.diagnostico_negocio)
            pagoDiagnostico.estado == 1 ? datos.etapa = 'Diagnóstico pagado' : datos.etapa = datos.etapa;
        }

        let acuerdo = await consultarDatos('acuerdo_confidencial')
        acuerdo = acuerdo.find(x => x.id_empresa == idEmpresa)
        if (acuerdo) acuerdo.estadoAcuerdo == 2 ? datos.etapa = 'Acuerdo firmado' : datos.etapa = datos.etapa;

        if (empresa) {
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
    }

    // CAPTURANDO CONSULTORES ASIGNADOS A LA EMPRESA
    let divConsultores = 'none';
    let consultores_asignados = await consultarDatos('consultores_asignados')
    consultores_asignados = consultores_asignados.filter(x => x.empresa == idEmpresa)
    if (consultores_asignados.length > 0) {
        divConsultores = 'contents';
        consultores_asignados.forEach(c => {
            const consultor = consultores.find(x => x.id_consultores == c.consultor)
            c.consultor = consultor.nombres + " " + consultor.apellidos
        })
    }

    /************************************************************************************************************* */
    // Tabla de Diagnóstico - Empresas Nuevas & Establecidas
    const frmDiag = {}
    let diagnostico = await consultarDatos('dg_empresa_establecida')
    diagnostico = diagnostico.find(x => x.id_empresa == idEmpresa && x.id_consultor == idConsultor)
    let dgNuevasEmpresas = await consultarDatos('dg_empresa_nueva')
    dgNuevasEmpresas = dgNuevasEmpresas.find(x => x.id_empresa == idEmpresa && x.id_consultor == idConsultor)
    
    if (!diagnostico && !dgNuevasEmpresas) {
        frmDiag.color = 'badge-danger'
        frmDiag.texto = 'Pendiente'
        frmDiag.fechaLocal = true;
        frmDiag.tablasVacias = true;
    } else {        
        frmDiag.color = 'badge-success'
        frmDiag.estilo = 'linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%); color: #FFFF'
        frmDiag.texto = 'Completado'
        frmDiag.estado = true;

        if (diagnostico) {
            datos.etapa = 'Cuestionario empresa establecida'
            frmDiag.fecha = diagnostico.fecha;
            frmDiag.tabla1 = true;
            frmDiag.tabla2 = false;
        } else {
            datos.etapa = 'Cuestionario empresa nueva'
            frmDiag.fecha = dgNuevasEmpresas.fecha;
            frmDiag.tabla1 = false;
            frmDiag.tabla2 = true;
        }
    }

    // Respuestas del Cuestionario Diagnóstico Empresa Establecida
    const resDiag = {}
    if (frmDiag.tabla1) {
        const r = diagnostico
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
        const r = dgNuevasEmpresas
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
    const frmInfo = {}
    const info = {
        prod: { ver: 'none' },
        adm: { ver: 'none' },
        op: { ver: 'none' },
        marketing: { ver: 'none' },
        analisis: { ver: 'none' },
        plan: { ver: 'none' }
    }
    let tablaInformes = await consultarDatos('informes', 'ORDER BY id_informes DESC')
    tablaInformes = tablaInformes.find(x => x.id_empresa == idEmpresa)
    if (tablaInformes) {
        frmInfo.fecha = tablaInformes.fecha;
        frmInfo.ver1 = 'block';
        frmInfo.ver2 = 'none';
        frmInfo.url = tablaInformes.url;
    } else {
        frmInfo.ver1 = 'none';
        frmInfo.ver2 = 'block';
        frmInfo.url = '#'
    }

    /** **************************************************************** */
    // Informe de diagnóstico
    const informeDiag = await consultarInformes(idEmpresa, "Informe diagnóstico")
    // Informe de dimensión producto
    const informeProd = await consultarInformes(idEmpresa, "Informe de dimensión producto")
    // Informe de dimensión administración
    const informeAdmin = await consultarInformes(idEmpresa, "Informe de dimensión administración")
    // Informe de dimensión operaciones
    const informeOperaciones = await consultarInformes(idEmpresa, "Informe de dimensión operaciones")
    // Informe de dimensión marketing
    const informeMarketing = await consultarInformes(idEmpresa, "Informe de dimensión marketing")
    // Informe de análisis
    const informeAnalisis = await consultarInformes(idEmpresa, "Informe de análisis")
    // Informe de Plan estratégico
    const informePlan = await consultarInformes(idEmpresa, "Informe de plan estratégico")

    if (informeDiag) {
        frmInfo.fecha = informeDiag.fecha;
        frmInfo.ver1 = 'block';
        frmInfo.ver2 = 'none';
        frmInfo.url = informeDiag.url;
        datos.etapa = 'Informe general de diagnóstico de negocio'
    }

    /************************************************************************************* */

    /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
    const propuestas = await consultarDatos('propuestas')
    const propuesta = {}
    propuesta.analisis = propuestas.find(i => i.empresa == idEmpresa && i.tipo_propuesta == 'Análisis de negocio')
    let pagos_analisis = {};
    if (propuesta.analisis) {
        datos.etapa = 'Propuesta de análisis enviada'

        /** PAGOS DE ANÁLISIS DE NEGOCIO (ÚNICO o DIVIDIDO*/
        pagos_analisis.unico = JSON.parse(pay.analisis_negocio)
        pagos_analisis.uno = JSON.parse(pay.analisis_negocio1)
        pagos_analisis.dos = JSON.parse(pay.analisis_negocio2)
        pagos_analisis.tres = JSON.parse(pay.analisis_negocio3)

        pagos_analisis.unico.color = pagos_analisis.uno.color = pagos_analisis.dos.color = pagos_analisis.tres.color = 'warning';
        pagos_analisis.unico.txt = pagos_analisis.uno.txt = pagos_analisis.dos.txt = pagos_analisis.tres.txt = 'Pendiente';
        pagos_analisis.unico.btn = pagos_analisis.uno.btn = true;
        pagos_analisis.dos.btn = pagos_analisis.tres.btn = false;

        pagos_analisis.unico.precio = propuesta.analisis.precio_total
        pagos_analisis.uno.precio = propuesta.analisis.precio_per1
        pagos_analisis.dos.precio = propuesta.analisis.precio_per2
        pagos_analisis.tres.precio = propuesta.analisis.precio_per3

        if (pagos_analisis.unico.estado == 1) {
            datos.etapa = 'Análisis de negocio pago único'
            pagos_analisis.unico.color = 'success'
            pagos_analisis.unico.txt = 'Pagado 100%'
            propuesta.analisis.pago = true;
            pagos_analisis.unico.btn = false;
        }
        if (pagos_analisis.uno.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 60%'
            pagos_analisis.uno.color = 'success'
            pagos_analisis.uno.txt = 'Pagado 60%'
            propuesta.analisis.pago = true;
            pagos_analisis.uno.btn = false;
            pagos_analisis.dos.btn = true;
        }
        if (pagos_analisis.dos.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 80%'
            pagos_analisis.dos.color = 'success'
            pagos_analisis.dos.txt = 'Pagado 80%'
            pagos_analisis.dos.btn = false;
            pagos_analisis.tres.btn = true;
        }
        if (pagos_analisis.tres.estado == 2) {
            datos.etapa = 'Análisis de negocio - Pagado 100%'
            pagos_analisis.tres.color = 'success'
            pagos_analisis.tres.txt = 'Pagado 100%'
            pagos_analisis.tres.btn = false;
        }
    }

    if (informeProd) {
        info.prod.fecha = informeProd.fecha;
        info.prod.ver = 'block';
        info.prod.url = informeProd  .url;
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
        datos.etapa = 'Informe general de análisis de negocio'
    }

    if (informePlan) {
        // info.plan.ok = true;
        info.plan.fecha = informePlan.fecha;
        info.plan.ver = 'block';
        info.plan.url = informePlan.url;
        datos.etapa = 'Informe de plan estratégico de negocio'
    }

    /************** DATOS PARA LAS GRÁFICAS DE DIAGNÓSTICO - ÁREAS VITALES & POR DIMENSIONES ****************/
    let jsonDimensiones1 = null, jsonDimensiones2 = null, nuevosProyectos = 0, rendimiento = {}, jsonAnalisis1 = null, jsonAnalisis2 = null;
    let areasVitales = await consultarDatos('indicadores_areasvitales', 'ORDER BY id_ ASC')
    areasVitales = areasVitales.find(x => x.id_empresa == idEmpresa)
    let areasVitales2 = await consultarDatos('indicadores_areasvitales', 'ORDER BY id_ DESC')
    areasVitales2 = areasVitales2.find(x => x.id_empresa == idEmpresa)
    if (areasVitales) {
        jsonAnalisis1 = JSON.stringify(areasVitales);
        jsonAnalisis2 = JSON.stringify(areasVitales2);
        if (areasVitales.rendimiento_op >= 1) {
            rendimiento.op = areasVitales.rendimiento_op
        } else {
            rendimiento.op = false;
        }
    }

    let resulCateg = await consultarDatos('resultado_categorias')
    resulCateg = resulCateg.find(x => x.id_empresa == idEmpresa)
    if (resulCateg) {
        jsonDimensiones1 = JSON.stringify(resulCateg);
        nuevosProyectos = 1;
        // Rendimiento del Proyecto
        rendimiento.num = resulCateg.rendimiento
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

    let xDimensiones = await consultarDatos('indicadores_dimensiones', 'ORDER BY id ASC')
    xDimensiones = xDimensiones.find(x => x.id_empresa == idEmpresa)
    let xDimensiones2 = await consultarDatos('indicadores_dimensiones', 'ORDER BY id DESC')
    xDimensiones2 = xDimensiones2.find(x => x.id_empresa == idEmpresa)
    if (xDimensiones) {
        jsonDimensiones1 = JSON.stringify(xDimensiones);
        jsonDimensiones2 = JSON.stringify(xDimensiones2);
        nuevosProyectos = 0;
    }

    /************************************************************************************* */
    // ARCHIVOS CARGADOS
    let archivos = false;
    let analisis = await consultarDatos('analisis_empresa')
    analisis = analisis.find(i => i.id_empresa == idEmpresa)
    if (analisis) {
        if (analisis.archivos) {
            archivos = JSON.parse(analisis.archivos)
        }
    }

    /** ANÁLISIS DE NEGOCIO POR DIMENSIONES - RESPUESTAS DE CUESTIONARIOS */
    let dimProducto = false, dimAdmin = false, dimOperacion = false, dimMarketing = false;
    const analisis_empresa = await consultarDatos('analisis_empresa')
    const analisisDimensiones = analisis_empresa.find(x => x.id_empresa == idEmpresa)
    if (analisisDimensiones) {
        const dimension = analisisDimensiones
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

    /**************************************************************************************** */
    // PLAN EMPRESARIAL *************/
    // PROPUESTA
    propuesta.empresarial = propuestas.find(i => i.empresa == idEmpresa && i.tipo_propuesta == 'Plan empresarial')
    let pagos_empresarial = {};
    if (propuesta.empresarial) {
        datos.etapa = 'Propuesta de plan empresarial enviada'

        /** PAGOS DE PLAN EMPRESARIAL (ÚNICO o DIVIDIDO*/
        pagos_empresarial.unico = JSON.parse(pay.empresarial0)
        pagos_empresarial.uno = JSON.parse(pay.empresarial1)
        pagos_empresarial.dos = JSON.parse(pay.empresarial2)
        pagos_empresarial.tres = JSON.parse(pay.empresarial3)

        pagos_empresarial.unico.color = pagos_empresarial.uno.color = pagos_empresarial.dos.color = pagos_empresarial.tres.color = 'warning';
        pagos_empresarial.unico.txt = pagos_empresarial.uno.txt = pagos_empresarial.dos.txt = pagos_empresarial.tres.txt = 'Pendiente';
        pagos_empresarial.unico.btn = pagos_empresarial.uno.btn = true;
        pagos_empresarial.dos.btn = pagos_empresarial.tres.btn = false;

        pagos_empresarial.unico.precio = propuesta.empresarial.precio_total
        pagos_empresarial.uno.precio = propuesta.empresarial.precio_per1
        pagos_empresarial.dos.precio = propuesta.empresarial.precio_per2
        pagos_empresarial.tres.precio = propuesta.empresarial.precio_per3

        if (pagos_empresarial.unico.estado == 1) {
            datos.etapa = 'Plan empresarial pago único'
            pagos_empresarial.unico.color = 'success'
            pagos_empresarial.unico.txt = 'Pagado 100%'
            propuesta.empresarial.pago = true;
            pagos_empresarial.unico.btn = false;
        }
        if (pagos_empresarial.uno.estado == 2) {
            datos.etapa = 'Plan empresarial - Pagado 60%'
            pagos_empresarial.uno.color = 'success'
            pagos_empresarial.uno.txt = 'Pagado 60%'
            propuesta.empresarial.pago = true;
            pagos_empresarial.uno.btn = false;
            pagos_empresarial.dos.btn = true;
        }
        if (pagos_empresarial.dos.estado == 2) {
            datos.etapa = 'Plan empresarial - Pagado 80%'
            pagos_empresarial.dos.color = 'success'
            pagos_empresarial.dos.txt = 'Pagado 80%'
            pagos_empresarial.dos.btn = false;
            pagos_empresarial.tres.btn = true;
        }
        if (pagos_empresarial.tres.estado == 2) {
            datos.etapa = 'Plan empresarial - Pagado 100%'
            pagos_empresarial.tres.color = 'success'
            pagos_empresarial.tres.txt = 'Pagado 100%'
            pagos_empresarial.tres.btn = false;
        }
    }

    /** VALIDAR EL ROL DEL USUARIO */
    let rolAdmin = false, consultorDash = false, itemActivo = 3, adminDash = true;
    if (req.user.rol == 'Admin') {
        rolAdmin = true;
    } else {
        consultorDash = true;
        itemActivo = 2;
        adminDash = false;
        aprobarConsultor = false;
    }

    /************************************************************************************* */
    // PLAN ESTRATÉGICO DE NEGOCIO *************/

    // PROPUESTA
    propuesta.estrategico = propuestas.find(i => i.empresa == idEmpresa && i.tipo_propuesta == 'Plan estratégico')
    let pagoEstrategico = {};
    if (propuesta.estrategico) {
        datos.etapa = 'Propuesta de plan estratégico enviada'

        // PAGO DE PLAN ESTRATÉGICO
        pagoEstrategico = JSON.parse(pay.estrategico)
        pagoEstrategico.color = 'warning';
        pagoEstrategico.txt = 'Pendiente';
        pagoEstrategico.btn = false;
        pagoEstrategico.precio = propuesta.estrategico.precio_total

        if (pagoEstrategico.estado == 1) {
            datos.etapa = 'Pago por subscripcion de plan estratégico iniciado'
            pagoEstrategico.color = 'success'
            pagoEstrategico.txt = 'Pagada'
            pagoEstrategico.btn = true;
            propuesta.estrategico.pago = true;
        } else if (pagoEstrategico.estado == 2) {
            pagoEstrategico.color = 'danger'
            pagoEstrategico.txt = 'Cancelada'
            pagoEstrategico.btn = false;
            propuesta.estrategico.pago = true;
        }
    }

    // PROCESO PARA LAS TAREAS DE LA EMPRESA
    const fechaActual = new Date().toLocaleDateString('fr-CA');
    const tareas = await consultarTareas(idEmpresa, fechaActual)
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
        (estado1.length * 100) / dim1,
        (estado2.length * 100) / dim2,
        (estado3.length * 100) / dim3,
        (estado4.length * 100) / dim4
    ]
    const jsonDim = JSON.stringify([
        { ok: Math.round(listo[0]), pendiente: Math.round(100 - listo[0]) },
        { ok: Math.round(listo[1]), pendiente: Math.round(100 - listo[1]) },
        { ok: Math.round(listo[2]), pendiente: Math.round(100 - listo[2]) },
        { ok: Math.round(listo[3]), pendiente: Math.round(100 - listo[3]) }
    ])

    let datosTabla = await consultarDatos('rendimiento_empresa')
    datosTabla = datosTabla.filter(x => x.empresa == idEmpresa)
    let jsonRendimiento = false;
    if (datosTabla.length > 0) jsonRendimiento = JSON.stringify(datosTabla);

    res.render('admin/editarEmpresa', {
        adminDash, consultorDash, itemActivo, empresa, formEdit: true, datos, consultores,
        aprobarConsultor, frmDiag, frmInfo, consultores_asignados, divConsultores,
        jsonAnalisis1, jsonAnalisis2, jsonDimensiones1, jsonDimensiones2, resDiag, nuevosProyectos, rendimiento,
        graficas2: true, propuesta, pagos_analisis, archivos, divInformes, filaInforme,
        pagoEstrategico, info, dimProducto, dimAdmin, dimOperacion, dimMarketing,
        tareas, jsonDim, jsonRendimiento, fechaActual,
        pagos_empresarial,
        rolAdmin
    })

}

dashboardController.actualizarEmpresa = async (req, res) => {
    const { idEmpresa, codigo, estadoAdm, mapa } = req.body;
    const mapaConsultores = new Map(Object.entries(mapa)) 
    console.log("mapaConsultores > ", mapaConsultores)

    // Consultar Datos de la empresa
    let empresa = await consultarDatos('empresas')
    empresa = empresa.find(x => x.codigo = codigo)

    // Consultores Asignados
    const asignados = await pool.query('SELECT * FROM consultores_asignados WHERE empresa = ?', [idEmpresa])
    for (const [key, value] of mapaConsultores) {
        const filtro = asignados.find(x => x.etapa == key)
        if (filtro) {
            const dato = {consultor: value.id}
            await pool.query('UPDATE consultores_asignados SET ? WHERE empresa = ? AND etapa = ?', [dato, idEmpresa, key])
        } else {
            const datos = {consultor: value.id, empresa: idEmpresa, etapa: key}
            await pool.query('INSERT INTO consultores_asignados SET ?', [datos])    
        }
    }

    // Cambiando estado de la cuenta de la empresa (Activa o Bloqueada)
    const estado = { estadoAdm }
    await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Empresa"', [estado, codigo], (err, result) => {
        if (err) { res.send(false); throw err; }
        res.send(true)
    })

}

dashboardController.bloquearEmpresa = async (req, res) => {
    const { id } = req.body
    let respu = false;
    const actualizar = { estadoAdm: 0 }
    const empresa = await pool.query('SELECT id_empresas, codigo FROM empresas WHERE id_empresas = ? LIMIT 1', [id])
    if (empresa.length > 0) {
        const e = await pool.query('SELECT * FROM users WHERE codigo = ?  AND rol = "Empresa"', [empresa[0].codigo])
        if (e.length > 0 && e[0].estadoAdm == 0) {
            res.send(respu)
        } else {
            await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Empresa"', [actualizar, empresa[0].codigo], (err, result) => {
                if (err) throw err;
                if (result.affectedRows > 0) { respu = true }
                res.send(respu)
            })
        }
    }
}


/** PAGOS MANUALES ETAPA 1 y 2 */
dashboardController.pagoManualDiagnostico = async (req, res) => {
    const { id } = req.body
    const fecha = new Date().toLocaleDateString("en-US")
    const data = { estado: 1, fecha }
    const actualizarPago = { diagnostico_negocio: JSON.stringify(data) }
    await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarPago, id], (err, result) => {
        if (err) throw err;
        res.send(result)
    })
}

dashboardController.pagoManualEmpresas = async (req, res) => {
    const { num, id, etapa } = req.body
    const fecha = new Date().toLocaleDateString("en-US")
    let actualizarPago = false;
    const data = { estado: 2, fecha }
    
    if (etapa == 2) {
        if (num == 0) {
            actualizarPago = { 
                analisis_negocio: JSON.stringify({ estado: 1, fecha }),
                analisis_negocio1: JSON.stringify({ estado: 0 })
            }
        } else if (num == 1) { 
            actualizarPago = { analisis_negocio1: JSON.stringify(data) }
        } else if (num == 2) {
            actualizarPago = { analisis_negocio2: JSON.stringify(data) }
        } else {
            actualizarPago = { analisis_negocio3: JSON.stringify(data) }
        }
    } else if (etapa == 3) {
        actualizarPago = { 
            estrategico: JSON.stringify({ estado: 1, fecha }),
        }
    } else {
        if (num == 0) {
            actualizarPago = { 
                empresarial0: JSON.stringify({ estado: 1, fecha }),
                empresarial1: JSON.stringify({ estado: 0 })
            }
        } else if (num == 1) { 
            actualizarPago = { empresarial1: JSON.stringify(data) }
        } else if (num == 2) {
            actualizarPago = { empresarial2: JSON.stringify(data) }
        } else {
            actualizarPago = { empresarial3: JSON.stringify(data) }
        }
    }

    await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarPago, id], (err, result) => {
        if (err) throw err;
        if (result.affectedRows > 0) res.send(true)
        else res.send(false)
    })
}

// CUESTIONARIO DIAGNÓSTICO DE NEGOCIO EXCEL (EMPRESA ESTABLECIDA)
dashboardController.cuestionario = async (req, res) => {
    const { codigo } = req.params;
    res.render('consultor/cuestionario', { wizarx: true, user_dash: false, adminDash: false, codigo })
}
dashboardController.enviarCuestionario = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })

    const infoEmp = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigoEmpresa])
    // Capturar ID Empresa
    const id_empresa = infoEmp[0].id_empresas;
    // Capturar ID Consultor
    const id_consultor = infoEmp[0].consultor;

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

    // RENDIMIENTO EMPRESA
    let { total_ventas, total_compras, total_gastos } = req.body
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
    const { ambienteLab_positivo, medicion_ambienteLab, agrado_empleados, comunicacion_efectiva, comunicar_buen_trabajo, calificacion_ambiente } = req.body
    let ambiente_laboral = JSON.stringify({
        ambienteLab_positivo, medicion_ambienteLab, agrado_empleados, comunicacion_efectiva, comunicar_buen_trabajo, calificacion_ambiente
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
    let fortalezas = JSON.stringify({ f1, f2, f3, f4, f5 })

    // Oportunidades de Mejora
    const { o1, o2, o3, o4, o5 } = req.body
    let oportunidades_mejoras = JSON.stringify({ o1, o2, o3, o4, o5 })

    // Metas a corto plazo
    const { m1, m2, m3, m4, m5 } = req.body
    let metas_corto_plazo = JSON.stringify({ m1, m2, m3, m4, m5 })

    // Creando Objetos para guardar en la base de datos
    const nuevoDiagnostico = { id_empresa, id_consultor, fecha, productos_servicios, administracion, talento_humano, finanzas, servicio_alcliente, operaciones, ambiente_laboral, innovacion, marketing, ventas, fortalezas, oportunidades_mejoras, metas_corto_plazo }

    const areasVitales = {
        id_empresa,
        producto: calificacion_global_producto,
        administracion: calificacion_administracion,
        talento_humano: calificacion_personal_laboral,
        finanzas: calificacion_finanzas,
        servicio_cliente: calificacion_servicio_alcliente,
        operaciones: calificacion_operaciones_procesos,
        ambiente_laboral: calificacion_ambiente,
        innovacion: calificacion_innovacion,
        marketing: calificacion_marketing,
        ventas: calificacion_ventas,
        rendimiento_op: parseInt(calificacion_global_producto) + parseInt(calificacion_administracion) + parseInt(calificacion_personal_laboral) + parseInt(calificacion_finanzas) + parseInt(calificacion_servicio_alcliente) + parseInt(calificacion_operaciones_procesos) + parseInt(calificacion_ambiente) + parseInt(calificacion_innovacion) + parseInt(calificacion_marketing) + parseInt(calificacion_ventas)
    }

    const sumaR = calificacion_global_producto + calificacion_administracion + calificacion_personal_laboral + calificacion_finanzas + calificacion_servicio_alcliente + calificacion_operaciones_procesos + calificacion_ambiente + calificacion_innovacion + calificacion_marketing + calificacion_ventas;

    const areasDimensiones = {
        id_empresa,
        producto: parseInt(calificacion_global_producto),
        administracion: (parseInt(calificacion_administracion) + parseInt(calificacion_personal_laboral) + parseInt(calificacion_finanzas)) / 3,
        operaciones: (parseInt(calificacion_servicio_alcliente) + parseInt(calificacion_operaciones_procesos) + parseInt(calificacion_ambiente) + parseInt(calificacion_innovacion)) / 4,
        marketing: (parseInt(calificacion_marketing) + parseInt(calificacion_ventas)) / 2
    }

    // Guardando en la Base de datos
    const cuestionario = await pool.query('INSERT INTO dg_empresa_establecida SET ?', [nuevoDiagnostico])
    if (cuestionario.affectedRows > 0) {
        /************************************************************************************************* */
        // RENDIMIENTO DE LA EMPRESA
        total_ventas = total_ventas.replace(/[$ ]/g, '');
        total_ventas = total_ventas.replace(/[,]/g, '.');
        total_compras = total_compras.replace(/[$ ]/g, '');
        total_compras = total_compras.replace(/[,]/g, '.');
        total_gastos = total_gastos.replace(/[$ ]/g, '');
        total_gastos = total_gastos.replace(/[,]/g, '.');
        const utilidad = parseFloat(total_ventas) - parseFloat(total_compras) - parseFloat(total_gastos)
        const nuevoRendimiento = {
            empresa: id_empresa, total_ventas, total_compras, total_gastos, utilidad, fecha: new Date().toLocaleDateString("en-US")
        }
        const rendimiento = await pool.query('INSERT INTO rendimiento_empresa SET ?', [nuevoRendimiento])
        /************************************************************************************************* */
        const aVitales = await pool.query('INSERT INTO indicadores_areasvitales SET ?', [areasVitales])
        const aDimensiones = await pool.query('INSERT INTO indicadores_dimensiones SET ?', [areasDimensiones])
        if ((aVitales.affectedRows > 0) && (aDimensiones.affectedRows > 0) && (rendimiento.affectedRows > 0)) {
            console.log("\nINSERCIÓN COMPLETA DE LOS INDICADORES DE LA EMPRESA\n")
            res.redirect('/empresas/' + codigoEmpresa + '#diagnostico_')
        }
    }

}

// CUESTIONARIO DIAGNÓSTICO (EMPRESAS NUEVAS)
dashboardController.dgNuevosProyectos = async (req, res) => {
    const { codigo } = req.params;
    res.render('consultor/nuevos_proyectos', { wizarx: true, user_dash: false, adminDash: false, codigo })
}
dashboardController.guardarRespuestas = async (req, res) => {

    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado con base a su Zona Horaria
    const fecha = new Date().toLocaleString("en-US", { timeZone: zhActualAdm })
    // Consultando info de la empresa
    const infoEmp = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigoEmpresa])
    // Capturar ID Empresa
    const id_empresa = infoEmp[0].id_empresas;
    // Capturar ID Consultor
    const id_consultor = infoEmp[0].consultor;

    // EXPERIENCIA EN EL RUBRO
    const { rubro, exp_previa, foda, unidades_rubro, actividades, vision } = req.body
    let exp_rubro = JSON.stringify({ exp_previa, foda, unidades_rubro, actividades, vision })

    // MENTALIDAD EMPRESARIAL
    const { proposito_alineado, objetivos_claros, valores, foda_personal, tiempo_completo } = req.body
    let mentalidad_empresarial = JSON.stringify({ proposito_alineado, objetivos_claros, valores, foda_personal, tiempo_completo })

    // VIABILIDAD DEL NEGOCIO
    const { socios, fondo_financiero, ubicacion_fisica, estudio_mercado, recursos_claves, posibles_proveedores } = req.body
    let viabilidad = JSON.stringify({ socios, fondo_financiero, ubicacion_fisica, estudio_mercado, recursos_claves, posibles_proveedores })

    // PRODUCTOS O SERVICIOS
    const { problema_resolver, producto_principal, precio_venta, factor_diferenciador, modelo_negocio } = req.body
    let productos_servicios = JSON.stringify({ problema_resolver, producto_principal, precio_venta, factor_diferenciador, modelo_negocio })

    // ADMINISTRACIÓN
    const { planeacion_estrategica, sistema_inventario, estructura_organizacional } = req.body
    let administracion = JSON.stringify({ planeacion_estrategica, sistema_inventario, estructura_organizacional })

    // TALENTO HUMANO
    const { funciones_principales, formacion_inicial, tiempo_colaboradores, experiencia_liderando, importancia_equipo } = req.body
    let talento_humano = JSON.stringify({ funciones_principales, formacion_inicial, tiempo_colaboradores, experiencia_liderando, importancia_equipo })

    // FINANZAS
    const { estructura_costos, gastos_fijos_variables, control_financiero, punto_equilibrio, recuperar_inversion } = req.body
    let finanzas = JSON.stringify({ estructura_costos, gastos_fijos_variables, control_financiero, punto_equilibrio, recuperar_inversion })

    // SERVICIO AL CLIENTE
    const { canales_atencion, estrategia_fidelizar, exp_brindar, medir_satisfaccion, calidad_producto } = req.body
    let servicio_cliente = JSON.stringify({ canales_atencion, estrategia_fidelizar, exp_brindar, medir_satisfaccion, calidad_producto })

    // OPERACIONES
    const { permisos, planificar_actividades, conocer_procesos, canales_comercial, proceso_devoluciones } = req.body
    let operaciones = JSON.stringify({ permisos, planificar_actividades, conocer_procesos, canales_comercial, proceso_devoluciones })

    // AMBIENTE LABORAL
    const { crecimiento, comunicacion_efectiva, resaltar_habilidades, capacitar_crecimiento, buen_ambiente } = req.body
    let ambiente_laboral = JSON.stringify({ crecimiento, comunicacion_efectiva, resaltar_habilidades, capacitar_crecimiento, buen_ambiente })

    // INNOVACION
    const { modelo_innovador, importancia_innovacion, gestion_datos } = req.body
    let innovacion = JSON.stringify({ modelo_innovador, importancia_innovacion, gestion_datos })

    // MARKETING
    const { estrategia_marketing, dominio_web, segmento_cliente, tiene_logo, mercado_inicial } = req.body
    let marketing = JSON.stringify({ estrategia_marketing, dominio_web, segmento_cliente, tiene_logo, mercado_inicial })

    // VENTAS
    const { captacion_clientes, medios_pago, proyeccion } = req.body
    let ventas = JSON.stringify({ captacion_clientes, medios_pago, proyeccion })

    // METAS A CORTO PLAZO
    const { m1, m2, m3, m4, m5 } = req.body
    let metas = JSON.stringify({ m1, m2, m3, m4, m5 })

    const nuevoDiagnostico = { id_empresa, id_consultor, fecha, rubro, exp_rubro, mentalidad_empresarial, viabilidad, productos_servicios, administracion, talento_humano, finanzas, servicio_cliente, operaciones, ambiente_laboral, innovacion, marketing, ventas, metas }

    /* ========================== Calculos del Diagnóstico ========================== */
    // Categorías
    const categorias = [
        { nom: 'Experiencia en el Rubro', peso: 25, cant: 5 },
        { nom: 'Mentalidad Empresarial', peso: 25, cant: 5 },
        { nom: 'Viabilidad del Negocio', peso: 25, cant: 6 },
        { nom: 'Estructura del Negocio', peso: 25, cant: 44 }
    ]
    categorias.forEach(c => {
        c.valor = parseFloat(c.peso / c.cant)
    });

    // Estructura del Negocio
    const eNegocio = [
        { nom: 'Producto', peso: 2.5, cant: 5 },
        { nom: 'Administración', peso: 2.5, cant: 3 },
        { nom: 'Talento Humano', peso: 2.5, cant: 5 },
        { nom: 'Finanzas', peso: 2.5, cant: 5 },
        { nom: 'Serivicio al Cliente', peso: 2.5, cant: 5 },
        { nom: 'Operaciones', peso: 2.5, cant: 5 },
        { nom: 'Ambiente Laboral', peso: 2.5, cant: 5 },
        { nom: 'Innovación', peso: 2.5, cant: 3 },
        { nom: 'Marketing', peso: 2.5, cant: 5 },
        { nom: 'Ventas', peso: 2.5, cant: 3 },
    ]
    eNegocio.forEach(e => {
        e.valor = parseFloat(e.peso / e.cant)
        //e.valor = e.valor.toFixed(9)
    });

    // Resultado de Áreas Vitales
    let cant0 = JSON.parse(productos_servicios)
    cant0 = Object.values(cant0).filter(n => n == 'Si').length
    let cant1 = JSON.parse(administracion)
    cant1 = Object.values(cant1).filter(n => n == 'Si').length
    let cant2 = JSON.parse(talento_humano)
    cant2 = Object.values(cant2).filter(n => n == 'Si').length
    let cant3 = JSON.parse(finanzas)
    cant3 = Object.values(cant3).filter(n => n == 'Si').length
    let cant4 = JSON.parse(servicio_cliente)
    cant4 = Object.values(cant4).filter(n => n == 'Si').length
    let cant5 = JSON.parse(operaciones)
    cant5 = Object.values(cant5).filter(n => n == 'Si').length
    let cant6 = JSON.parse(ambiente_laboral)
    cant6 = Object.values(cant6).filter(n => n == 'Si').length
    let cant7 = JSON.parse(innovacion)
    cant7 = Object.values(cant7).filter(n => n == 'Si').length
    let cant8 = JSON.parse(marketing)
    cant8 = Object.values(cant8).filter(n => n == 'Si').length
    let cant9 = JSON.parse(ventas)
    cant9 = Object.values(cant9).filter(n => n == 'Si').length

    // Grupo de Áreas Vitales

    const areasVitales = {
        id_empresa,
        producto: Math.round(cant0 * eNegocio[0].valor),
        administracion: Math.round(cant1 * eNegocio[1].valor),
        talento_humano: Math.round(cant2 * eNegocio[2].valor),
        finanzas: Math.round(cant3 * eNegocio[3].valor),
        servicio_cliente: Math.round(cant4 * eNegocio[4].valor),
        operaciones: Math.round(cant5 * eNegocio[5].valor),
        ambiente_laboral: Math.round(cant6 * eNegocio[6].valor),
        innovacion: Math.round(cant7 * eNegocio[7].valor),
        marketing: Math.round(cant8 * eNegocio[8].valor),
        ventas: Math.round(cant9 * eNegocio[9].valor),
    }

    console.log("\n<<<<< ÁREAS VITALES >>>>> ", areasVitales)

    // Resultado de Categorías
    let c1 = JSON.parse(exp_rubro)
    c1 = Object.values(c1).filter(n => n == 'Si').length
    let c2 = JSON.parse(mentalidad_empresarial)
    c2 = Object.values(c2).filter(n => n == 'Si').length
    let c3 = JSON.parse(viabilidad)
    c3 = Object.values(c3).filter(n => n == 'Si').length
    let c4 = parseInt(cant0 + cant1 + cant2 + cant3 + cant4 + cant5 + cant6 + cant7 + cant8 + cant9)

    let valoracion = [
        Math.round(c1 * categorias[0].valor),
        Math.round(c2 * categorias[1].valor),
        Math.round(c3 * categorias[2].valor),
        Math.round(c4 * categorias[3].valor)
    ]

    // Sumar Valoración de las Categorías
    const suma = (acumulador, actual) => acumulador + actual;
    const rendimiento = valoracion.reduce(suma)
    console.log("RENDIMIENTO CATEGORIAS >>> ", rendimiento)

    const resulCategorias = {
        id_empresa,
        experiencia_rubro: valoracion[0],
        mentalidad: valoracion[1],
        viabilidad_: valoracion[2],
        estructura: valoracion[3],
        rendimiento: rendimiento
    }

    // Guardando en la Base de datos
    const cuestionario = await pool.query('INSERT INTO dg_empresa_nueva SET ?', [nuevoDiagnostico])
    if (cuestionario.affectedRows > 0) {

        const aVitales = await pool.query('INSERT INTO indicadores_areasvitales SET ?', [areasVitales])
        const resultado_categorias = await pool.query('INSERT INTO resultado_categorias SET ?', [resulCategorias])
        if ((aVitales.affectedRows > 0) && (resultado_categorias.affectedRows > 0)) {
            console.log("\nINSERCIÓN COMPLETA DE LOS INDICADORES DE LA EMPRESA\n")
            res.redirect('/empresas/' + codigoEmpresa + '#diagnostico_')
        }
    }
}

/** ====================================== SUBIR INFORMES EMPRESAS ============================================= */
let urlInforme = "";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const rutaInforme = path.join(__dirname, '../public/informes_empresas')
        cb(null, rutaInforme);
    },

    filename: function (req, file, cb) {
        // const fechaActual = Math.floor(Date.now() / 1000)
        urlInforme = "Informe-3C-Sigma-Empresa-" + file.originalname;
        console.log(urlInforme)
        cb(null, urlInforme)
    }

});
const subirInforme = multer({ storage })
dashboardController.subirInforme = subirInforme.single('file')
dashboardController.guardarInforme = async (req, res) => {
    const r = { ok: false }
    const { codigoEmpresa, nombreInforme, zonaHoraria } = req.body
    console.log(req.body)
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.codigo == codigoEmpresa)
    const empresasNuevas = await consultarDatos('dg_empresa_nueva')
    const eNueva = empresasNuevas.find(x => x.id_empresa == e.id_empresas)
    const fecha = new Date()
    const nuevoInforme = {
        id_empresa: e.id_empresas,
        id_consultor: e.consultor,
        nombre: nombreInforme,
        url: '../informes_empresas/' + urlInforme,
        fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
        mes: fecha.getMonth() + 1,
        year: fecha.getFullYear()
    }

    const actualizar = {
        url: '../informes_empresas/' + urlInforme,
        fecha: fecha.toLocaleString("en-US", { timeZone: zonaHoraria }),
        mes: fecha.getMonth() + 1,
        year: fecha.getFullYear()
    }

    // Validando si ya tiene un informe montado
    const tieneInforme = await pool.query('SELECT * FROM informes WHERE id_empresa = ? AND nombre = ? ', [e.id_empresas, nombreInforme])
    let informe = null;

    if (tieneInforme.length > 0) {
        informe = await pool.query('UPDATE informes SET ? WHERE id_empresa = ? AND nombre = ?', [actualizar, e.id_empresas, nombreInforme])
    } else {
        informe = await pool.query('INSERT INTO informes SET ?', [nuevoInforme])
    }

    if (informe.affectedRows > 0) {

        const nombreEmpresa_ = e.nombre_empresa;
        const email = e.email
        let tipoInforme = nombreInforme.toLowerCase();
        let asunto = 'Se ha cargado un nuevo ' + tipoInforme
        let template = informesHTML(nombreEmpresa_, tipoInforme);
        
        if (nombreInforme == 'Informe diagnóstico') {
            asunto = 'Diagnóstico de negocio finalizado'
            const etapa = 'Diagnóstico de negocio';
            const link = 'diagnostico-de-negocio';
            template = etapaFinalizadaHTML(nombreEmpresa_, etapa, link);
        }
        if (nombreInforme == 'Informe de análisis') {
            asunto = 'Análisis de negocio finalizado'
            const etapa = 'Análisis de negocio';
            const link = 'analisis-de-negocio';
            template = etapaFinalizadaHTML(nombreEmpresa_, etapa, link);
        }
        if (nombreInforme == 'Informe de plan estratégico') {
            asunto = 'Plan estratégico de negocio finalizado'
            const etapa = 'Plan estratégico de negocio';
            const link = 'plan-estrategico';
            template = etapaFinalizadaHTML(nombreEmpresa_, etapa, link);
        }
        
        // Enviar Email
        const resultEmail = await sendEmail(email, asunto, template)

        if (resultEmail == false) {
            console.log("\n<<<<< Ocurrio un error inesperado al enviar el email de informe subido >>>> \n")
        } else {
            console.log("\n<<<<< Se ha notificado la subida de un informe al email de la empresa >>>>>\n")
        }

        r.ok = true;
        r.fecha = nuevoInforme.fecha;
        r.url = nuevoInforme.url
    }

    res.send(r)
}