const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')

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
    const nuevoEstado = { estadoAdm: estado }
    const urlCalendly = {usuario_calendly}
    const c1 = await pool.query('UPDATE users SET ? WHERE codigo = ? AND rol = "Consultor"', [nuevoEstado, codigo])
    const c2 = await pool.query('UPDATE consultores SET ? WHERE codigo = ?', [urlCalendly, codigo])
    let respuesta = false;
    if (c1.affectedRows > 0 || c2.affectedRows > 0) {
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

    res.render('panel/editarEmpresa', { adminDash: true, itemActivo: 3, empresa, formEdit: true, datos, consultores, aprobarConsultor, frmDiag })

}

dashboardController.actualizarEmpresa = async (req, res) => {
    const { codigo, id_consultor, estadoAdm } = req.body;
    let consul = { consultor: id_consultor };
    console.log("\n <<< DATOS CAPTURADOS PARA ACTUALIZAR EMPRESA >>>", req.body);

    // Asignando y/o actualizando consultor a la empresa
    if (id_consultor == '' || id_consultor == null) { consul.consultor = null }

    const asignado = await pool.query('UPDATE empresas SET ? WHERE codigo = ?', [consul, codigo])

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
    const e = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigo])
    let row = await pool.query('SELECT * FROM diagnostico_empresas WHERE id_empresa = ? LIMIT 1', [e.id_empresas])
    row = row[0]
    res.render('consultor/cuestionario', {wizarx: true, user_dash: false, adminDash: false })
}