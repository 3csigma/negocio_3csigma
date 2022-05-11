const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')

let acuerdoFirmado = false, pagoPendiente = true, diagnosticoPagado = 0, analisisPagado = 0;

/** Función para mostrar Dashboard & validación dependiendo del usuario */
dashboardController.index = async (req, res) => {
    const tipoUser = req.user.rol;

    console.log("\n<<<< ROL >>>> " + tipoUser + "\n");

    if (tipoUser == 'Admin') {

        const consultores = await pool.query('SELECT * FROM consultores WHERE rol = "Consultor" ORDER BY id DESC LIMIT 2')
        const empresas = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 2')
        res.render('panel/panelAdmin', { adminDash: true, itemActivo: 1, consultores, empresas });

    } else {
        req.intentPay = undefined; // Intento de pago
        const id_user = req.user.id;
        req.pagoDiag = false, pagoDiag = false;

        if (tipoUser == 'User') { companyUser = true; }

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
                if (acuerdo[0].estado == 2) {
                    acuerdoFirmado = true;
                    noPago = false;
                }
            }
        }

        // console.log("** ¿ACUERDO FIRMADO? ==> ", acuerdoFirmado)
        // console.log("** ¿USUARIO PAGÓ DIAGNOSTICO? ==> ", diagnosticoPagado)
        // console.log("** ¿USUARIO PAGÓ ANÁLISIS? ==> ", analisisPagado)
        res.render('pages/dashboard', {
            user_dash: true, wizarx: false, pagoPendiente, diagnosticoPagado, analisisPagado, pagoDiag, itemActivo: 1, acuerdoFirmado
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
    res.render('panel/editarConsultor', { adminDash: true, itemActivo: 2, consultor, formEdit: true})
}

dashboardController.actualizarConsultor = async (req, res) => {
    const {id, estado} = req.body;
    const nuevoEstado = {estado}
    const consultor = await pool.query('UPDATE consultores SET ? WHERE id = ?', [nuevoEstado, id])
    let respuesta = false;
    if (consultor) {
        respuesta = true;
    }
    res.send(respuesta)
}

// EMPRESAS
dashboardController.mostrarEmpresas = async (req, res) => {
    let empresas = await pool.query('SELECT * FROM users WHERE rol = "User" AND estado = 1')
    res.render('panel/mostrarEmpresas', { adminDash: true, itemActivo: 3, empresas })
}

dashboardController.editarEmpresa = async (req, res) => {
    const codigo = req.params.codigo
    let empresa = await pool.query('SELECT * FROM users e LEFT OUTER JOIN ficha_cliente f ON e.id = f.id_user AND e.codigo = ? LIMIT 1', [codigo])
    console.log("-------")
    console.log(empresa)
    console.log("-------")
    res.render('panel/editarEmpresa', { adminDash: true, itemActivo: 3, empresa, formEdit: true})
}

dashboardController.actualizarEmpresa = async (req, res) => {
    console.log("Hola")
}