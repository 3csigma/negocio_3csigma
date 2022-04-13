const pool = require('../database')
const empresaController = exports;
const config = require('../config/index.js').config;

// Función para validar el Pago del Diagnóstico de Negocio
empresaController.pagoDiagnostico = async (req, res) => {
    console.log("Pago para Activar Diagnóstico de Negocio")
}

empresaController.acuerdo = async (req, res) => {
    /**
     * Estados (Acuerdo de Confidencialidad):
     * Sin enviar: 0, Enviado: 1, Firmado: 2
     */
    const id_user = req.user.id;
    let estado = {}, email;
    // Validar si el documento fue enviado

    const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ?', [id_user])
    if (acuerdo.length === 0) {
        const newAcuerdo = { id_user } // Campo id_user para la tabla acuerdo_confidencial
        estado.sinEnviar = true; // Documento sin enviar 
        estado.valor = 0; 
        await pool.query('INSERT INTO acuerdo_confidencial SET ?', [newAcuerdo], (err, result) => {
            if (err) throw err;
            console.log("1 Registro insertado");
            res.redirect('/acuerdo-de-confidencialidad')
        })
        // const sql = ('INSERT INTO acuerdo_confidencial SET ?', [newAcuerdo])
        // pool.query(sql, function (err, result) {
        //     if (err) throw err;
        //     console.log("1 Registro insertado");
        //   });
    } else {
        if (req.session.email_user) {
            newDatos = {
                email_signer: req.session.email_user,
                estado: 1
            }
            await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_user = ?', [newDatos, id_user], (err, result) => {
                if (err) throw err;
                console.log(result.affectedRows + " registro actualizado");
                req.session.email_user = undefined;
                res.redirect('/acuerdo-de-confidencialidad')
            })
        }
        estado.valor = acuerdo[0].estado;
        if (estado.valor == 0) {
            estado.sinEnviar = true;
            estado.form = true;
        } else if (estado.valor == 1) {
            estado.enviado = true;
            estado.form = true;
            email = acuerdo[0].email_signer
        } else {
            estado.firmado = true
        }
    }
    console.log("<<< TABLA ACUERDO >>>", estado)
    const acuerdoFirmado = estado.firmado
    console.log("Email Signer => ", email)
    res.render('empresa/acuerdoConfidencial', { dashx: true, tipoUser: 'User', itemActivo: 2, estado, email, acuerdoFirmado })
}

empresaController.fichaCliente = async (req, res) => {
    const empresa = await pool.query('SELECT * FROM ficha_cliente')
    // const ficha = await pool.query('SELECT * FROM empresa WHERE id = ?', [id])
    res.render('/empresa/addFicha', { empresa, wizarx: true, dashx: false })
}

empresaController.addFichaCliente = async (req, res) => {
    let { nombre, apellido, email, telefono, fecha_nacimiento, pais, twitter, facebook, instagram, otra, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivo1, objetivo2, objetivo3, fortaleza1, fortaleza2, fortaleza3, problema1, problema2, problema3, motivo_consultoria } = req.body
    let redes_sociales = JSON.stringify({ twitter, facebook, instagram, otra })
    let objetivos = JSON.stringify({ objetivo1, objetivo2, objetivo3 })
    let fortalezas = JSON.stringify({ fortaleza1, fortaleza2, fortaleza3 })
    let problemas = JSON.stringify({ problema1, problema2, problema3 })
    es_propietario != undefined ? es_propietario : es_propietario = 'No'
    socios != undefined ? socios : socios = 'No'
    user_id = 2;
    const newFichaCliente = {
        nombre, apellido, email, telefono, fecha_nacimiento, pais, redes_sociales, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivos, fortalezas, problemas, motivo_consultoria, user_id
    }

    // JSON.parse(redes_sociales) // CONVERTIR  JSON A UN OBJETO
    console.log(newFichaCliente)
    await pool.query('INSERT INTO empresa SET ?', [newFichaCliente])
    res.redirect('/')
}

empresaController.editar = async (req, res) => {
    const { id } = req.params
    const ficha = await pool.query('SELECT * FROM ficha_cliente WHERE id = ?', [id])
    res.render('/empresa/addFicha', { ficha: ficha[0] })
}

empresaController.actualizado = async (req, res) => {
    const { id } = req.params
    const updateFicha = {}
    await pool.query('UPDATE ficha_cliente SET ? WHERE id = ?', [updateFicha, id])
    res.render('/empresa/addFicha', { ficha: ficha[0] })
}

// Función para validar el Pago del Análisis de Negocio
empresaController.pagoAnalisis = async (req, res) => {
    console.log("Pago para Activar Análisis de Negocio")
}