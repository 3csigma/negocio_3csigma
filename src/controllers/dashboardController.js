const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')
const helpers = require('../lib/helpers')

let acuerdoFirmado = false, pagoPendiente = true, diagnosticoPagado = 0, analisisPagado = 0;

/** Función para mostrar Dashboard & validación dependiendo del usuario */
dashboardController.index = async (req, res) => {
    const tipoUser = req.user.rol;
    console.log("\n<<<< ROL >>>> " + tipoUser + "\n");

    if (tipoUser == 'Admin') {

        const consultores = await pool.query('SELECT * FROM consultores WHERE rol = "Consultor" ORDER BY id DESC LIMIT 2')
        const empresas = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 2')
        res.render('panel/panelAdmin', { adminDash: true, user_dash: false, itemActivo: 1, consultores, empresas });

    } else {
        req.intentPay = undefined; // Intento de pago
        const id_user = req.user.id;
        req.pagoDiag = false, pagoDiag = false;

        /** Consultando que pagos ha realizado el usuario */
        const pagos = await pool.query('SELECT * FROM pagos WHERE id_user = ?', [id_user])
        if (pagos.length == 0) {
            const nuevoPago = { id_user }
            // await pool.query('UPDATE pagos SET ? WHERE id_user', [nuevoPago], (err, result) => {
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
            }
            if (pagos[0].analisis_negocio == '1') {
                analisisPagado = 1; // Pago Análisis
            }
        }

        if (diagnosticoPagado) {
            /** Consultando si el usuario ya firmó el acuerdo de confidencialidad */
            const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ?', [id_user])
            if (acuerdo.length > 0) {
                if (acuerdo[0].estadoAcuerdo == 2) {
                    acuerdoFirmado = true;
                    noPago = false;
                }
            }
        }

        // console.log("** ¿ACUERDO FIRMADO? ==> ", acuerdoFirmado)
        // console.log("** ¿USUARIO PAGÓ DIAGNOSTICO? ==> ", diagnosticoPagado)
        // console.log("** ¿USUARIO PAGÓ ANÁLISIS? ==> ", analisisPagado)
        res.render('pages/dashboard', {
            user_dash: true, adminDash: false, wizarx: false, pagoPendiente, diagnosticoPagado, analisisPagado, pagoDiag, itemActivo: 1, acuerdoFirmado
        })

    }

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
    let consultores = await pool.query('SELECT * FROM consultores WHERE rol = "Consultor"')

    consultores.forEach(async c => {
        const id_consul = c.id;
        const num = await pool.query('SELECT COUNT(*) AS numEmpresas FROM users WHERE id_consultor = ?', [id_consul])
        console.log(num[0].numEmpresas)
        c.num_empresas = num[0].numEmpresas
    });
    res.render('panel/mostrarConsultores', { adminDash: true, itemActivo: 2, consultores })
}

dashboardController.editarConsultor = async (req, res) => {
    const codigo = req.params.codigo
    let consultor = await pool.query('SELECT * FROM consultores WHERE codigo = ?', [codigo])
    consultor = consultor[0];
    if (consultor.certificado) {
        consultor.txtCertificado = consultor.certificado.split('/')[2]
    }
    res.render('panel/editarConsultor', { adminDash: true, itemActivo: 2, consultor, formEdit: true })
}

dashboardController.actualizarConsultor = async (req, res) => {
    const { id, estado } = req.body;
    const nuevoEstado = { estado }
    const consultor = await pool.query('UPDATE consultores SET ? WHERE id = ?', [nuevoEstado, id])
    let respuesta = false;
    if (consultor) {
        respuesta = true;
    }
    res.send(respuesta)
}

// EMPRESAS
dashboardController.mostrarEmpresas = async (req, res) => {
    // let empresas = await pool.query('SELECT e.*, f.telefono, f.id_user, c.nombres_consultor, c.apellidos_consultor FROM users e LEFT OUTER JOIN ficha_cliente f ON f.id_user = e.id LEFT OUTER JOIN consultores c ON c.id = e.id_consultor')
    let empresas = await pool.query('SELECT e.*, f.telefono, f.id_user, c.nombres_consultor, c.apellidos_consultor, p.id_user, p.diagnostico_negocio, p.analisis_negocio, a.id_user, a.estadoAcuerdo FROM users e LEFT OUTER JOIN ficha_cliente f ON f.id_user = e.id LEFT OUTER JOIN consultores c ON c.id = e.id_consultor LEFT OUTER JOIN pagos p ON p.id_user = e.id LEFT OUTER JOIN acuerdo_confidencial a ON a.id_user = e.id;')

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
    let empresa = await pool.query('SELECT * FROM empresas WHERE codigo = ? LIMIT 1', [codigo])
    empresa = empresa[0];
    const idUser = empresa.id;

    empresa.etapa = 'Email sin confirmar';
    let c1, c2;
    if (empresa){
        empresa.estadoEmail == 1 ? empresa.etapa = 'Email confirmado' : empresa.etapa = empresa.etapa;
        c1 = await pool.query('SELECT * FROM pagos WHERE id_user = ? LIMIT 1', [idUser])
        c2 = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ? LIMIT 1', [idUser])
        c1 = c1[0]; c2 = c2[0];
    }
    
    if (c1 || c2){
        c1.diagnostico_negocio == 1 ? empresa.etapa = 'Diagnóstico pagado' : empresa.etapa = empresa.etapa;
        c1.analisis_negocio == 1 ? empresa.etapa = 'Análisis pagado' : empresa.etapa = empresa.etapa;
        c2.estadoAcuerdo == 2 ? empresa.etapa = 'Acuerdo firmado' : empresa.etapa = empresa.etapa;
    }
    empresa.id_consultor != null ? empresa.etapa = 'Consultor asignado' : empresa.etapa = empresa.etapa;

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

    const consulAsignado = await pool.query('SELECT * FROM consultores WHERE id = ?', [empresa.id_consultor])
    let idConsultor = '';
    if (consulAsignado.length > 0) {
        idConsultor = consulAsignado[0].id;
        empresa.nomConsul = consulAsignado[0].nombres_consultor + " " + consulAsignado[0].apellidos_consultor;
    }

    let consultores = await pool.query('SELECT * FROM consultores')
    consultores.ideEmpresa = empresa.id_consultor
    consultores.forEach(cs => {
        cs.idCon = idConsultor;
    });

    res.render('panel/editarEmpresa', { adminDash: true, itemActivo: 3, empresa, formEdit: true, datos, consultores })
}

dashboardController.actualizarEmpresa = async (req, res) => {
    let { codigo, id_consultor, estadoAdm } = req.body;
    if (id_consultor == '' || id_consultor == null) { id_consultor = null }
    const actualizarEmpresa = { id_consultor, estadoAdm }
    await pool.query('UPDATE users SET ? WHERE codigo = ?', [actualizarEmpresa, codigo])
    res.redirect('/empresas')
}