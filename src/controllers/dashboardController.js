const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const { consultarInformes } = require('../lib/helpers')

const { consultorAsignadoHTML, consultorAprobadoHTML, informeDiagnosticoHTML, sendEmail } = require('../lib/mail.config')

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
    const ficha = await pool.query('SELECT * FROM ficha_cliente')

    empresas.forEach(e => {
        consultorAsignado.forEach(c => {
            if (e.consultor == c.id_consultores){
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

    res.render('admin/panelAdmin', { adminDash: true, itemActivo: 1, consultores, empresas, aprobarConsultor, graficas1: true });
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
    let empresas = await pool.query('SELECT e.*, u.codigo, u.estadoEmail, u.estadoAdm, f.telefono, f.id_empresa, p.id_empresa, p.diagnostico_negocio, p.analisis_negocio, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo AND rol = "Empresa"')

    const dg_nueva = await pool.query('SELECT * FROM dg_empresa_nueva')
    const dg_establecida = await pool.query('SELECT * FROM dg_empresa_establecida')
    
    const dg_analisis = await pool.query('SELECT * FROM analisis_empresa')

    const consultor = await pool.query('SELECT * FROM consultores')
    const informe = await pool.query('SELECT * FROM informes')

    const propuestas = await pool.query('SELECT * FROM propuesta_analisis')
    const pagos = await pool.query('SELECT * FROM pagos')

    empresas.forEach(e => {
        e.etapa = 'Email sin confirmar';
        e.estadoEmail == 1 ? e.etapa = 'Email confirmado' : e.etapa = e.etapa;
        e.diagnostico_negocio == 1 ? e.etapa = 'Diagnóstico pagado' : e.etapa = e.etapa;
        e.analisis_negocio == 1 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;
        e.estadoAcuerdo == 2 ? e.etapa = 'Acuerdo firmado' : e.etapa = e.etapa;
        e.telefono ? e.etapa = 'Ficha cliente' : e.etapa = e.etapa;

        if (dg_nueva.length > 0) {
            const _diag = dg_nueva.find(i => i.id_empresa == e.id_empresas)
            if (_diag)
                _diag.consecutivo ? e.etapa = 'Cuestionario diagnóstico' : e.etapa = e.etapa;
            
        }  
        
        if (dg_establecida.length > 0) {
            const _diag = dg_establecida.find(i => i.id_empresa == e.id_empresas)
            if (_diag)
                _diag.consecutivo ? e.etapa = 'Cuestionario diagnóstico' : e.etapa = e.etapa;
            
        }
        
        if (dg_analisis.length > 0) {
            const _diag = dg_analisis.find(i => i.id_empresa == e.id_empresas)
            if (_diag) 
                _diag.consecutivo ? e.etapa = 'Cuestionario análisis' : e.etapa = e.etapa;
        }

        const consultor_empresa = consultor.find(item => item.id_consultores == e.consultor)
        if (consultor_empresa) {
            e.nombre_consultor = consultor_empresa.nombres + " " + consultor_empresa.apellidos;
            e.codigo_consultor = consultor_empresa.codigo
        }

         /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
        const propuesta = propuestas.find(i => i.empresa == e.id_empresas)
        if (propuesta) {
            e.etapa = 'Propuesta de análisis enviada'
            const pay = pagos.find(i => i.id_empresa == e.id_empresas)
            if (pay.analisis_negocio == 1){
                e.etapa = 'Propuesta de análisis pagada'
                propuesta.pago = true;
            }
        }
        
        const informe_empresa = informe.find(i => i.id_empresa == e.id_empresas)
        if (informe_empresa) {
            e.etapa = 'Informe(s) cargado(s)';
        }
       
    });

    res.render('admin/mostrarEmpresas', { adminDash: true, itemActivo: 3, empresas, aprobarConsultor })
}

dashboardController.editarEmpresa = async (req, res) => {
    const codigo = req.params.codigo, datos = {};
    let consultores = null, c1, c2;

    let userEmpresa = await pool.query('SELECT * FROM users WHERE codigo = ? AND rol = "Empresa" LIMIT 1', [codigo])

    // Empresa tabla Usuarios
    let filas = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigo])
    console.log("FILAS >> ", filas)
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

    // CAPTURANDO CONSULTOR ASIGNADO A LA EMPRESA
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

    /************************************************************************************************************* */
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

    /***************** Tabla de Informes ******************* */ 
    const frmInfo = {}
    const info = {
        prod : {ver: 'none'},
        adm : {ver: 'none'},
        op : {ver: 'none'},
        marketing : {ver: 'none'},
        analisis : {ver: 'none'},
        plan : {ver: 'none'}
    }
    let tablaInformes = await pool.query('SELECT * FROM informes WHERE id_empresa = ? AND id_consultor = ? ORDER BY id_informes DESC', [idUser, idConsultor])
    if (tablaInformes.length > 0){
        frmInfo.fecha = tablaInformes[0].fecha;
        frmInfo.ver1 = 'block';
        frmInfo.ver2 = 'none';
        frmInfo.url = tablaInformes[0].url;
        datos.etapa = 'Informe diagnóstico'
    } else{
        frmInfo.ver1 = 'none';
        frmInfo.ver2 = 'block';
        frmInfo.url = '#'
    }

    /** **************************************************************** */
    // Informe de diagnóstico
    const informeDiag = await consultarInformes(idUser, idConsultor, "Informe diagnóstico")
    // Informe de dimensión producto
    const informeProd = await consultarInformes(idUser, idConsultor, "Informe de dimensión producto")
    // Informe de dimensión administración
    const informeAdmin = await consultarInformes(idUser, idConsultor, "Informe de dimensión administración")
    // Informe de dimensión operaciones
    const informeOperaciones = await consultarInformes(idUser, idConsultor, "Informe de dimensión operaciones")
    // Informe de dimensión marketing
    const informeMarketing = await consultarInformes(idUser, idConsultor, "Informe de dimensión marketing")
    // Informe de análisis
    const informeAnalisis = await consultarInformes(idUser, idConsultor, "Informe análisis")
    // Informe de Plan estratégico
    const informePlan = await consultarInformes(idUser, idConsultor, "Informe Plan estratégico")

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
        info.prod.url = informeProd[0].url;
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

    console.log("INFORME DEL PLAN >>> ", informePlan)
    if (informePlan) {
        info.plan.ok = true;
        info.plan.fecha = informePlan.fecha;
        info.plan.ver = 'block';
        info.plan.url = informePlan.url;
        datos.etapa = 'Informe Plan estratégico'
    }
    

    /************** DATOS PARA LAS GRÁFICAS DE DIAGNÓSTICO - ÁREAS VITALES & POR DIMENSIONES ****************/
    let jsonDimensiones1 = null, jsonDimensiones2 = null, nuevosProyectos = 0, rendimiento = {},
    jsonAnalisis1 = null, jsonAnalisis2 = null;

    let areasVitales = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ ASC LIMIT 1', [idUser])
    let areasVitales2 = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ DESC LIMIT 1', [idUser])
    if (areasVitales.length > 0) {
        jsonAnalisis1 = JSON.stringify(areasVitales[0]);
        jsonAnalisis2 = JSON.stringify( areasVitales2[0]);
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

    /************************************************************************************* */

    /** PROPUESTA DE ANÁLISIS DE NEGOCIO - PDF */
    const propuestas = await pool.query('SELECT * FROM propuesta_analisis')
    const propuesta = propuestas.find(i => i.empresa == idUser)
    let pagos_analisis = {ok:false};
    if (propuesta) {
        datos.etapa = 'Propuesta de análisis enviada'
        const pagos = await pool.query('SELECT * FROM pagos')

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

        if (pagos_analisis.unico.estado == 1){
            datos.etapa = 'Análisis de negocio pago único'
            propuesta.pago = true;
            pagos_analisis.ok = true;
        }
        if (pagos_analisis.uno.estado == 2){
            datos.etapa = 'Análisis de negocio - Pagado 60%'
            pagos_analisis.uno.color = 'success'
            pagos_analisis.uno.txt = 'Pagado 60%'
            pagos_analisis.ok = true;
            propuesta.pago = true;
        } else {
            pagos_analisis.uno.color = 'warning'
            pagos_analisis.uno.txt = 'Pendiente'
        }
        if (pagos_analisis.dos.estado == 2){
            datos.etapa = 'Análisis de negocio - Pagado 80%'
            pagos_analisis.dos.color = 'success'
            pagos_analisis.dos.txt = 'Pagado 80%'
        } else {
            pagos_analisis.dos.color = 'warning'
            pagos_analisis.dos.txt = 'Pendiente'
        }
        if (pagos_analisis.tres.estado == 2){
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
        if (analisis.archivos){
            archivos = JSON.parse(analisis.archivos)
        }
    }

    /** ANÁLISIS DE NEGOCIO POR DIMENSIONES - RESPUESTAS DE CUESTIONARIOS */
    let dimProducto = false, dimAdmin = false, dimOperacion = false, dimMarketing = false;
    const analisisDimensiones = await pool.query('SELECT * FROM analisis_empresa WHERE id_empresa = ? LIMIT 1', [idUser])
    if (analisisDimensiones.length > 0) {
        const dimension = analisisDimensiones[0]
        if (dimension.producto) {
            const prod = JSON.parse(dimension.producto)
            dimProducto = {
                fecha : prod.fecha,
                publico_objetivo : prod.publico_objetivo,
                beneficios : prod.beneficios,
                tipo_producto : prod.tipo_producto,
                nivel_precio : prod.nivel_precio,
                mas_vendidos : prod.mas_vendidos,
                razon_venta : prod.razon_venta,
                integracion_gama : prod.integracion_gama,
                calidad : prod.calidad,
                aceptacion : prod.aceptacion,
            }
        }
        if (dimension.administracion) {
            const admin = JSON.parse(dimension.administracion)
            dimAdmin = {
                fecha : admin.fecha,
                v: admin.vision,
                mision: admin.mision,
                valores: admin.valores,
                f: admin.foda,
                estructura_organizativa: admin.estructura_organizativa,
                tipo_sistema: admin.tipo_sistema,
                sistema_facturacion : admin.sistema_facturacion,
                av_th : admin.av_talento_humano,
                av_fz : admin.av_finanzas,
            }
        }
        if (dimension.operacion) {
            const op = JSON.parse(dimension.operacion)
            dimOperacion = {
                fecha : op.fecha,
                info_productos : op.info_productos,
                satisfaccion: op.satisfaccion,
                encuesta_clientes : op.encuesta_clientes,
                informacion_deClientes : op.informacion_deClientes,
                utilidad_libro_quejas : op.utilidad_libro_quejas,
                beneficio_libro_quejas : op.beneficio_libro_quejas,
                estrategia__libro_quejas : op.estrategia__libro_quejas,
                fidelizacion_clientes : op.fidelizacion_clientes,
                av_op : op.av_operaciones,
                av_ambiente : op.av_ambiente_laboral,
                av_innovacion : op.av_innovacion,
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
    let divInformes = false
    if (dimProducto && dimAdmin && dimOperacion && dimMarketing) {divInformes = true}
    /* --------------------------------------------------------------------------------------- */

    /************************************************************************************* */
    // PLAN ESTRATÉGICO DE NEGOCIO
    const tareas = {}
    tareas.todas = await pool.query('SELECT * FROM plan_estrategico WHERE empresa = ?', [idUser])
    tareas.todas.forEach(x => {
        if (x.estado == 0) x.estado = 'Pendiente'
        if (x.estado == 1) x.estado = 'En Proceso'
        if (x.estado == 2) x.estado = 'Completada'
        const dateObj = new Date(x.fecha_entrega);
        const mes = dateObj.toLocaleString("es-US", { month: "short" });
        x.dia = dateObj.getDate()+1
        x.mes = mes.replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());
        if (x.dimension == 'Producto') x.icono = 'fa-box'
        if (x.dimension == 'Administración') x.icono = 'fa-user-tie'
        if (x.dimension == 'Operaciones') x.icono = 'fa-gear'
        if (x.dimension == 'Marketing') x.icono = 'fa-bullhorn'
    })
    tareas.pendientes = tareas.todas.filter(i => i.estado == 'Pendiente')
    tareas.enProceso = tareas.todas.filter(i => i.estado == 'En Proceso')
    tareas.completadas = tareas.todas.filter(i => i.estado == 'Completada')

    res.render('admin/editarEmpresa', { 
        adminDash: true, itemActivo: 3, empresa, formEdit: true, datos, consultores, aprobarConsultor, frmDiag, frmInfo,
        jsonAnalisis1, jsonAnalisis2, jsonDimensiones1, jsonDimensiones2, resDiag, nuevosProyectos, rendimiento,
        graficas2: true, propuesta, pagos_analisis, archivos, divInformes,
        info, dimProducto, dimAdmin, dimOperacion, dimMarketing,
        fechaActual: new Date().toLocaleDateString('fr-CA'),
        tareas
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


// CUESTIONARIO DIAGNÓSTICO DE NEGOCIO EXCEL (EMPRESA ESTABLECIDA)
dashboardController.cuestionario = async (req, res) => {
    const { codigo } = req.params;
    let volver = '/empresas/'
    if (req.user.rol == 'Consultor') {
        volver = '/empresas-asignadas/'+codigo;
    }
    res.render('consultor/cuestionario', { wizarx: true, user_dash: false, adminDash: false, codigo, volver })
}

dashboardController.enviarCuestionario = async (req, res) => {
    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado
    const fecha = new Date().toLocaleString("en-US", {timeZone: zhActualAdm})
    
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
        rendimiento_op: parseInt(calificacion_global_producto)+parseInt(calificacion_administracion)+parseInt(calificacion_personal_laboral)+parseInt(calificacion_finanzas)+parseInt(calificacion_servicio_alcliente)+parseInt(calificacion_operaciones_procesos)+parseInt(calificacion_ambiente)+parseInt(calificacion_innovacion)+parseInt(calificacion_marketing)+parseInt(calificacion_ventas)
    }

    const sumaR = calificacion_global_producto+
    calificacion_administracion+
    calificacion_personal_laboral+
    calificacion_finanzas+
    calificacion_servicio_alcliente+
    calificacion_operaciones_procesos+
    calificacion_ambiente+
    calificacion_innovacion+
    calificacion_marketing+
    calificacion_ventas

    console.log("\n <<<<<<<< SUMA INDIVIDUAL >>> ", sumaR + "\n")
    console.log("\n <<<<<<<< SUMA DE RENDIMIENTO DEL NEGOCIO >>> ", areasVitales.rendimiento_op + "\n")

    const areasDimensiones = { id_empresa,
        producto: parseInt(calificacion_global_producto),
        administracion: (parseInt(calificacion_administracion)+parseInt(calificacion_personal_laboral)+parseInt(calificacion_finanzas))/3,
        operaciones: (parseInt(calificacion_servicio_alcliente)+parseInt(calificacion_operaciones_procesos)+parseInt(calificacion_ambiente)+parseInt(calificacion_innovacion))/4,
        marketing: (parseInt(calificacion_marketing)+parseInt(calificacion_ventas))/2
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
        const utilidad = parseFloat(total_ventas)-parseFloat(total_compras)-parseFloat(total_gastos)
        const nuevoRendimiento = {empresa: id_empresa, total_ventas, total_compras, total_gastos, utilidad}
        const rendimiento = await pool.query('INSERT INTO rendimiento_empresa SET ?', [nuevoRendimiento])
        /************************************************************************************************* */
        const aVitales = await pool.query('INSERT INTO indicadores_areasvitales SET ?', [areasVitales])
        const aDimensiones = await pool.query('INSERT INTO indicadores_dimensiones SET ?', [areasDimensiones])
        if ((aVitales.affectedRows > 0) && (aDimensiones.affectedRows > 0) && (rendimiento.affectedRows > 0)) {
            console.log("\nINSERCIÓN COMPLETA DE LOS INDICADORES DE LA EMPRESA\n")
            if (req.user.rol == 'Consultor'){
                res.redirect('/empresas-asignadas/'+codigoEmpresa)
            } else {
                res.redirect('/empresas/'+codigoEmpresa)
            }
        }
    }

}

// CUESTIONARIO DIAGNÓSTICO (EMPRESAS NUEVAS)
dashboardController.dgNuevosProyectos = async (req, res) => {
    const { codigo } = req.params;
    let volver = '/empresas/'
    if (req.user.rol == 'Consultor') {
        volver = '/empresas-asignadas/'+codigo;
    }
    res.render('consultor/nuevos_proyectos', { wizarx: true, user_dash: false, adminDash: false, codigo, volver })
}

dashboardController.guardarRespuestas = async (req, res) => {

    const { codigoEmpresa, zhActualAdm } = req.body;
    // Capturar Fecha de guardado con base a su Zona Horaria
    const fecha = new Date().toLocaleString("en-US", {timeZone: zhActualAdm})
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
    const { estructura_costos, gastos_fijos_variables, control_financiero, punto_equilibrio, recuperar_inversion  } = req.body
    let finanzas = JSON.stringify({ estructura_costos, gastos_fijos_variables, control_financiero, punto_equilibrio, recuperar_inversion  })

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
        { nom: 'Experiencia en el Rubro',    peso: 25, cant: 5 },
        { nom: 'Mentalidad Empresarial',     peso: 25, cant: 5 },
        { nom: 'Viabilidad del Negocio',     peso: 25, cant: 6 },
        { nom: 'Estructura del Negocio',     peso: 25, cant: 44 }
    ]
    categorias.forEach(c => {
        c.valor = parseFloat(c.peso/c.cant)
    });

    // Estructura del Negocio
    const eNegocio = [
        { nom: 'Producto',               peso: 2.5, cant: 5  },
        { nom: 'Administración',         peso: 2.5, cant: 3  },
        { nom: 'Talento Humano',         peso: 2.5, cant: 5  },
        { nom: 'Finanzas',               peso: 2.5, cant: 5  },
        { nom: 'Serivicio al Cliente',   peso: 2.5, cant: 5  },
        { nom: 'Operaciones',            peso: 2.5, cant: 5  },
        { nom: 'Ambiente Laboral',       peso: 2.5, cant: 5  },
        { nom: 'Innovación',             peso: 2.5, cant: 3  },
        { nom: 'Marketing',              peso: 2.5, cant: 5  },
        { nom: 'Ventas',                 peso: 2.5, cant: 3  },
    ]
    eNegocio.forEach(e => {
        e.valor = parseFloat(e.peso/e.cant)
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

    const areasVitales = { id_empresa,
        producto: Math.round(cant0*eNegocio[0].valor),
        administracion: Math.round(cant1*eNegocio[1].valor),
        talento_humano: Math.round(cant2*eNegocio[2].valor),
        finanzas: Math.round(cant3*eNegocio[3].valor),
        servicio_cliente: Math.round(cant4*eNegocio[4].valor),
        operaciones: Math.round(cant5*eNegocio[5].valor),
        ambiente_laboral: Math.round(cant6*eNegocio[6].valor),
        innovacion: Math.round(cant7*eNegocio[7].valor),
        marketing: Math.round(cant8*eNegocio[8].valor),
        ventas: Math.round(cant9*eNegocio[9].valor),
    }

    console.log("\n<<<<< ÁREAS VITALES >>>>> ", areasVitales)

    // Resultado de Categorías
    let c1 = JSON.parse(exp_rubro)
    c1 = Object.values(c1).filter(n => n == 'Si').length
    let c2 = JSON.parse(mentalidad_empresarial)
    c2 = Object.values(c2).filter(n => n == 'Si').length
    let c3 = JSON.parse(viabilidad)
    c3 = Object.values(c3).filter(n => n == 'Si').length
    let c4 = parseInt(cant0+cant1+cant2+cant3+cant4+cant5+cant6+cant7+cant8+cant9)
    
    let valoracion = [
        Math.round(c1*categorias[0].valor),
        Math.round(c2*categorias[1].valor),
        Math.round(c3*categorias[2].valor),
        Math.round(c4*categorias[3].valor)
    ]

    // Sumar Valoración de las Categorías
    const suma = (acumulador, actual) => acumulador + actual;
    const rendimiento = valoracion.reduce(suma)
    console.log("RENDIMIENTO CATEGORIAS >>> ", rendimiento)
    
    const resulCategorias = { id_empresa,
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
            if (req.user.rol == 'Consultor'){
                res.redirect('/empresas-asignadas/'+codigoEmpresa)
            } else{
                res.redirect('/empresas/'+codigoEmpresa)
            }
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
        const fechaActual = Math.floor(Date.now() / 1000)
        urlInforme = "Informe-3C-Sigma-Empresa-" + file.originalname;
        console.log(urlInforme)
        cb(null, urlInforme)
    }

});

const subirInforme = multer({ storage })
dashboardController.subirInforme = subirInforme.single('file')


dashboardController.guardarInforme = async (req, res) => {
    const r = { ok: false }
    const { codigoEmpresa, nombreInforme, zonaHoraria }  = req.body
    console.log(req.body)
    const e = await pool.query('SELECT * FROM empresas WHERE codigo = ?', [codigoEmpresa])
    const nuevoInforme = {
        id_empresa: e[0].id_empresas,
        id_consultor: e[0].consultor,
        nombre: nombreInforme,
        url: '../informes_empresas/'+urlInforme,
        fecha: new Date().toLocaleString("en-US", {timeZone: zonaHoraria})
    }

    const actualizar = {
        url: '../informes_empresas/'+urlInforme,
        fecha: new Date().toLocaleString("en-US", {timeZone: zonaHoraria})
    }
    
    // Validando si ya tiene un informe montado
    const tieneInforme = await pool.query('SELECT * FROM informes WHERE id_empresa = ? AND id_consultor = ? AND nombre = ? ', [e[0].id_empresas, e[0].consultor, nombreInforme])
    let informe = null;

    if (tieneInforme.length > 0) {
        informe = await pool.query('UPDATE informes SET ? WHERE id_empresa = ? AND id_consultor = ? AND nombre = ?', [actualizar, e[0].id_empresas, e[0].consultor, nombreInforme])
    } else {
        informe = await pool.query('INSERT INTO informes SET ?', [nuevoInforme])
    }

    if (informe.affectedRows > 0) {

        const nombre = e[0].nombre_empresa;
        const email = e[0].email
        let tipoInforme;
        if (nombreInforme == 'Informe diagnóstico') {
            tipoInforme = 'informe de diagnóstico de negocio'
        } else {
            tipoInforme = nombreInforme.toLowerCase();
        }

        const asunto = 'Se ha cargado un nuevo '+tipoInforme
        
        // Obtener la plantilla de Email
        const template = informeDiagnosticoHTML(nombre, tipoInforme);

        // Enviar Email
        const resultEmail = await sendEmail(email, asunto, template)

        if (resultEmail == false){
            res.json("Ocurrio un error inesperado al enviar el email de informe subido")
        } else {
            console.log("\n<<<<< Se ha notificado la subida de un informe al email de la empresa >>>>>\n")
        }

        r.ok = true;
        r.fecha = nuevoInforme.fecha;
        r.url = nuevoInforme.url
    }
   
    res.send(r)
}