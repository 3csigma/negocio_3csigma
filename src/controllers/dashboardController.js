const dashboardController = exports;
const pool = require('../database')
const passport = require('passport')

let acuerdoFirmado = false, pagoPendiente = true, diagnosticoPagado = 0, analisisPagado = 0;

/** Función para mostrar Dashboard de Empresas */
dashboardController.index = async (req, res) => {
    diagnosticoPagado = 0;
    req.intentPay = undefined; // Intento de pago
    const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
    const id_empresa = row[0].id_empresas;
    req.pagoDiag = false, pagoDiag = false;

    /** Consultando que pagos ha realizado el usuario */
    const pagos = await pool.query('SELECT * FROM pagos WHERE id_empresa = ?', [id_empresa])
    if (pagos.length == 0) {
        const nuevoPago = { id_empresa }
        await pool.query('INSERT INTO pagos SET ?', [nuevoPago], (err, result) => {
            if (err) throw err;
            console.log("Registro exitoso en la tabla pagos -> ", result);
            res.redirect('/')
        })
    } else {
        if (pagos[0].diagnostico_negocio == '1') {
            // PAGÓ EL DIAGNOSTICO
            diagnosticoPagado = 1;
            req.pagoDiag = true;
            pagoDiag = req.pagoDiag;

            /** Consultando si el usuario ya firmó el acuerdo de confidencialidad */
            const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_empresa = ?', [id_empresa])
            if (acuerdo.length > 0) {
                if (acuerdo[0].estadoAcuerdo == 2) {
                    acuerdoFirmado = true;
                    noPago = false;
                }
            }

        }

        // PAGÓ EL ANÁLISIS
        pagos[0].analisis_negocio == '1' ? analisisPagado = 1 :

            console.log("** ¿ACUERDO FIRMADO? ==> ", acuerdoFirmado)
        console.log("** ¿USUARIO PAGÓ DIAGNOSTICO? ==> ", diagnosticoPagado)
        console.log("** ¿USUARIO PAGÓ ANÁLISIS? ==> ", analisisPagado)
        res.render('pages/dashboard', {
            user_dash: true, pagoPendiente, diagnosticoPagado, analisisPagado, pagoDiag, itemActivo: 1, acuerdoFirmado
        })

    }
}

// Dashboard Administrativo
dashboardController.admin = async (req, res) => {
    const consultores = await pool.query('SELECT * FROM consultores ORDER BY id_consultores DESC LIMIT 2')
    const empresas = await pool.query('SELECT * FROM empresas ORDER BY id_empresas DESC LIMIT 2')
    
    const consultorAsignado = await pool.query('SELECT * FROM consultores')

    empresas.forEach(e => {
        consultorAsignado.forEach(c => {
            if (e.consultor == c.id_consultores){
                e.nombre_consultor = c.nombres + " " + c.apellidos;
            }
        })

    });

    res.render('panel/panelAdmin', { adminDash: true, itemActivo: 1, consultores, empresas });
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
    let consultores = await pool.query('SELECT c.*, u.codigo, u.estadoAdm FROM consultores c LEFT OUTER JOIN users u ON c.codigo = u.codigo;')

    consultores.forEach(async c => {
        const num = await pool.query('SELECT COUNT(*) AS numEmpresas FROM empresas WHERE consultor = ?', [c.id_consultores])
        c.num_empresas = num[0].numEmpresas
    });

    res.render('panel/mostrarConsultores', { adminDash: true, itemActivo: 2, consultores })
}

dashboardController.editarConsultor = async (req, res) => {
    const codigo = req.params.codigo
    let consultor = await pool.query('SELECT c.*, u.codigo, u.estadoAdm FROM consultores c LEFT OUTER JOIN users u ON c.codigo = ? AND c.codigo = u.codigo;', [codigo])
    consultor = consultor[0];
    if (consultor.certificado) {
        consultor.txtCertificado = consultor.certificado.split('/')[2]
    }
    res.render('panel/editarConsultor', { adminDash: true, itemActivo: 2, consultor, formEdit: true })
}

dashboardController.actualizarConsultor = async (req, res) => {
    const { codigo, estado } = req.body;
    const nuevoEstado = { estadoAdm: estado }
    const consultor = await pool.query('UPDATE users SET ? WHERE codigo = ?', [nuevoEstado, codigo])
    let respuesta = false;
    if (consultor) {
        respuesta = true;
    }
    res.send(respuesta)
}

// EMPRESAS
dashboardController.mostrarEmpresas = async (req, res) => {
    let empresas = await pool.query('SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.id_empresa, p.diagnostico_negocio, p.analisis_negocio, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = e.id_empresas LEFT OUTER JOIN pagos p ON p.id_empresa = e.id_empresas LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = e.id_empresas INNER JOIN users u ON u.codigo = e.codigo;')

    const consultor = await pool.query('SELECT * FROM consultores')

    empresas.forEach(e => {
        e.etapa = 'Email sin confirmar';
        e.estadoCuenta = 'Activa';
        e.estadoEmail == 1 ? e.etapa = 'Email confirmado' : e.etapa = e.etapa;
        e.diagnostico_negocio == 1 ? e.etapa = 'Diagnóstico pagado' : e.etapa = e.etapa;
        e.analisis_negocio == 1 ? e.etapa = 'Análisis pagado' : e.etapa = e.etapa;
        e.estadoAcuerdo == 2 ? e.etapa = 'Acuerdo firmado' : e.etapa = e.etapa;
        e.consultor ? e.etapa = 'Consultor asignado' : e.etapa = e.etapa;
        e.estadoAdm == 0 ? e.estadoCuenta = 'Bloqueada' : e.estadoCuenta = e.estadoCuenta;

        consultor.forEach(c => {
            if (e.consultor == c.id_consultores){
                e.nombre_consultor = c.nombres + " " + c.apellidos;
            }
        })

    });

    res.render('panel/mostrarEmpresas', { adminDash: true, itemActivo: 3, empresas })
}

dashboardController.editarEmpresa = async (req, res) => {
    const codigo = req.params.codigo, datos = {};
    let consultores = null, c1, c2;

    let userEmpresa = await pool.query('SELECT * FROM users WHERE codigo = ? LIMIT 1', [codigo])

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

    consultores = await pool.query('SELECT c.*, u.codigo, u.estadoAdm FROM consultores c INNER JOIN users u ON u.estadoAdm = 1 AND c.codigo = u.codigo')
    consultores.forEach(cs => {
        cs.idCon = idConsultor;
    });

    res.render('panel/editarEmpresa', { adminDash: true, itemActivo: 3, empresa, formEdit: true, datos, consultores })

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
    await pool.query('UPDATE users SET ? WHERE codigo = ?', [estado, codigo], (err, result) => {
        if (err) throw err;
        console.log("estado adm empresa >>>", result)
        res.redirect('/empresas')
    })

}