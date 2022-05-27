const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')

let acuerdoFirmado = false, pagoPendiente = true, diagnosticoPagado = 0, analisisPagado = 0;

/** Función para mostrar Dashboard de Empresas */
dashboardController.index = async (req, res) => {
    diagnosticoPagado = 0;
    req.intentPay = undefined; // Intento de pago
    const id_user = req.user.empresa;
    req.pagoDiag = false, pagoDiag = false;

    /** Consultando que pagos ha realizado el usuario */
    const pagos = await pool.query('SELECT * FROM pagos WHERE id_user = ?', [id_user])
    if (pagos.length == 0) {
        const nuevoPago = { id_user }
        await pool.query('INSERT INTO pagos SET ?', [nuevoPago], (err, result) => {
            if (err) throw err;
            console.log("Registro exitoso en la tabla pagos -> ", result);
            res.redirect('/')
        })
    } else {
        if (pagos[0].diagnostico_negocio == '1') {
            // Pago Diagnóstico
            diagnosticoPagado = 1;
            req.pagoDiag = true;
            pagoDiag = req.pagoDiag;

            /** Consultando si el usuario ya firmó el acuerdo de confidencialidad */
            const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ?', [id_user])
            if (acuerdo.length > 0) {
                if (acuerdo[0].estadoAcuerdo == 2) {
                    acuerdoFirmado = true;
                    noPago = false;
                }
            }

        }

        if (pagos[0].analisis_negocio == '1') {
            analisisPagado = 1; // Pago Análisis
        }

        console.log("** ¿ACUERDO FIRMADO? ==> ", acuerdoFirmado)
        console.log("** ¿USUARIO PAGÓ DIAGNOSTICO? ==> ", diagnosticoPagado)
        console.log("** ¿USUARIO PAGÓ ANÁLISIS? ==> ", analisisPagado)
        res.render('pages/dashboard', {
            user_dash: true, adminDash: false, pagoPendiente, diagnosticoPagado, analisisPagado, pagoDiag, itemActivo: 1, acuerdoFirmado
        })

    }

}

// Dashboard Administrativo
dashboardController.admin = async (req, res) => {
    const consultores = await pool.query('SELECT * FROM users WHERE rol = "Consultor" ORDER BY id DESC LIMIT 2')
    const empresas = await pool.query('SELECT * FROM users WHERE rol = "Empresa" ORDER BY id DESC LIMIT 2')
    res.render('panel/panelAdmin', { adminDash: true, user_dash: false, itemActivo: 1, consultores, empresas });
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
    let consultores = await pool.query('SELECT * FROM vista_consultores')

    consultores.forEach(async c => {
        const num = await pool.query('SELECT COUNT(*) AS numEmpresas FROM ficha_cliente WHERE userConsultor = ?', [c.ide_consultor])
        c.num_empresas = num[0].numEmpresas
    });

    res.render('panel/mostrarConsultores', { adminDash: true, itemActivo: 2, consultores })
}

dashboardController.editarConsultor = async (req, res) => {
    const codigo = req.params.codigo
    let consultor = await pool.query('SELECT * FROM vista_consultores WHERE codigo = ?', [codigo])
    consultor = consultor[0];
    if (consultor.certificado) {
        consultor.txtCertificado = consultor.certificado.split('/')[2]
    }
    res.render('panel/editarConsultor', { adminDash: true, itemActivo: 2, consultor, formEdit: true })
}

dashboardController.actualizarConsultor = async (req, res) => {
    const { id, estado } = req.body;
    const nuevoEstado = { estadoAdm: estado }
    const consultor = await pool.query('UPDATE users SET ? WHERE consultor = ?', [nuevoEstado, id])
    let respuesta = false;
    if (consultor) {
        respuesta = true;
    }
    res.send(respuesta)
}

// EMPRESAS
dashboardController.mostrarEmpresas = async (req, res) => {
    let empresas = await pool.query('SELECT e.*, f.telefono, f.id_user, p.id_user, p.diagnostico_negocio, p.analisis_negocio, a.id_user, a.estadoAcuerdo FROM users e LEFT OUTER JOIN ficha_cliente f ON f.id_user = e.id AND e.rol = "Empresa" INNER JOIN pagos p ON p.id_user = e.id LEFT OUTER JOIN acuerdo_confidencial a ON a.id_user = e.id;')
    // let empresas = await pool.query('SELECT e.*, f.telefono, f.id_user, c.nombres_consultor, c.apellidos_consultor, p.id_user, p.diagnostico_negocio, p.analisis_negocio, a.id_user, a.estadoAcuerdo FROM users e LEFT OUTER JOIN ficha_cliente f ON f.id_user = e.id LEFT OUTER JOIN consultores c ON c.id = e.id_consultor LEFT OUTER JOIN pagos p ON p.id_user = e.id LEFT OUTER JOIN acuerdo_confidencial a ON a.id_user = e.id')

    empresas.forEach(e => {
        e.etapa = 'Email sin confirmar';
        e.estadoCuenta = 'Activa';
        e.estadoEmail == 1 ? e.etapa = 'Email confirmado' : e.etapa = e.etapa;
        e.diagnostico_negocio == 1 ? e.etapa = 'Diagnóstico pagado' : e.etapa = e.etapa;
        e.analisis_negocio == 1 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;
        e.estadoAcuerdo == 2 ? e.etapa = 'Acuerdo firmado' : e.etapa = e.etapa;
        e.id_consultor ? e.etapa = 'Consultor asignado' : e.etapa = e.etapa;
        e.estadoAdm == 0 ? e.estadoCuenta = 'Bloqueada' : e.estadoCuenta;
    });

    res.render('panel/mostrarEmpresas', { adminDash: true, itemActivo: 3, empresas })
}

dashboardController.editarEmpresa = async (req, res) => {
    const codigo = req.params.codigo, datos = {};
    let consultores = null;
    // Empresa tabla Usuarios
    let filas = await pool.query('SELECT * FROM users WHERE rol = "Empresa" AND codigo = ? LIMIT 1', [codigo])
    filas = filas[0];
    const idUser = filas.empresa;
    // Empresa tabla Ficha Cliente
    let empresa = await pool.query('SELECT * FROM ficha_cliente WHERE id_user = ? LIMIT 1', [idUser])
    
    datos.nombre_completo = filas.nombres + " " + filas.apellidos;
    datos.nombre_empresa = filas.nombre_empresa;
    datos.email = filas.email;
    datos.estadoAdm = filas.estadoAdm;

    let c1, c2;
    if (filas) {
        filas.estadoEmail == 1 ? datos.etapa = 'Email confirmado' : datos.etapa = datos.etapa;
        c1 = await pool.query('SELECT * FROM pagos WHERE id_user = ? LIMIT 1', [idUser])
        c2 = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ? LIMIT 1', [idUser])
        // c1 = c1[0]; c2 = c2[0];
    }

    if (c1.length > 0) {
        c1[0].diagnostico_negocio == 1 ? datos.etapa = 'Diagnóstico pagado' : datos.etapa = datos.etapa;
        c1[0].analisis_negocio == 1 ? datos.etapa = 'Análisis pagado' : datos.etapa = datos.etapa;
    }
    if (c2.length > 0) {
        c2[0].estadoAcuerdo == 2 ? datos.etapa = 'Acuerdo firmado' : datos.etapa = datos.etapa;
    }

    if (empresa.length > 0) {
        empresa.userConsultor != null ? datos.etapa = 'Consultor asignado' : datos.etapa = datos.etapa;

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
        datos.code = codigo;

        const consulAsignado = await pool.query('SELECT * FROM vista_consultores WHERE ide_consultor = ?', [empresa.userConsultor])
        let idConsultor = '';
        if (consulAsignado.length > 0) {
            idConsultor = consulAsignado[0].id;
            empresa.nomConsul = consulAsignado[0].nombres + " " + consulAsignado[0].apellidos;
        }

        consultores = await pool.query('SELECT * FROM vista_consultores')
        consultores.ideEmpresa = empresa.ide_consultor
        consultores.forEach(cs => {
            cs.idCon = idConsultor;
        });
    }

    res.render('panel/editarEmpresa', { adminDash: true, itemActivo: 3, empresa, formEdit: true, datos, consultores })

}

dashboardController.actualizarEmpresa = async (req, res) => {
    let { codigo, id_consultor, estadoAdm } = req.body;
    if (id_consultor == '' || id_consultor == null) { id_consultor = null }
    const consultor = id_consultor
    const actualizarEmpresa = { consultor, estadoAdm }
    await pool.query('UPDATE users SET ? WHERE codigo = ?', [actualizarEmpresa, codigo])
    res.redirect('/empresas')
}