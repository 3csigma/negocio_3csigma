const pool = require('../database')
const empresaController = exports;
const dsConfig = require('../config/index.js').config;
const { listEnvelope } = require('./listEnvelopes');
const helpers = require('../lib/helpers')
const { Country } = require('country-state-city')

let acuerdoFirmado = false;

/** Creación & validación del proceso Acuerdo de Confidencialidad */
empresaController.acuerdo = async (req, res) => {
    /**
     * Estados (Acuerdo de Confidencialidad):
     * Sin enviar: 0, Enviado: 1, Firmado: 2
     */
    const id_user = req.user.empresa;
    const tipoUser = req.user.rol;
    let estado = {}, email, noPago = true, statusSign = '', fechaExp;
    const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ?', [id_user])

    if (acuerdo.length > 0) {
        // console.log("ARGS DATABASE >>>> ", JSON.parse(acuerdo[0].args))
        noPago = false;
        /** Validando si ya está firmado el documento y su estado de firmado (2) se encuentra en la base de datos */
        if (acuerdo[0].estadoAcuerdo == 2) {
            acuerdoFirmado = true;
            estado.valor = 2; //Documento Firmado
            estado.firmado = true;
            dsConfig.envelopeId = ''
        } else if (acuerdo[0].estadoAcuerdo == 1) { // Validando desde Docusign
            acuerdoFirmado = false;
            fechaExp = acuerdo[0].serverDate

            noPago = false;
            email = acuerdo[0].email_signer;
            const args = JSON.parse(acuerdo[0].args) // CONVERTIR  JSON A UN OBJETO

            // console.log("\nARGS DATABASE >>> ", args);

            const newToken = await helpers.authToken() //Generando nuevo Token para enviar a Docusign
            args.accessToken = newToken.access_token;

            const new_args = {args: JSON.stringify(args)}

            // console.log("\n<<<< NUEVO ARGS >>>>", args);
            await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_user = ?', [new_args, id_user])

            /** Consultando el estado del documento en Docusign */
            await listEnvelope(args, acuerdo[0].envelopeId).then((values) => {
                statusSign = values.envelopes[0].status //Capturando el estado desde Docusign
                // console.log("STATUS DOCUMENT FROM DOCUSIGN ==> ", statusSign) // sent or completed
            })

            estado.valor = 1; // Documento enviado
            estado.form = true; // Debe mostrar el formulario
            estado.enviado = true;

            /** Validando si el estado devuelto es enviado o firmado */
            if (statusSign == 'completed') { // Estado desde docusign (completed)
                estado.valor = 2; //Documento Firmado
                estado.firmado = true;
                acuerdoFirmado = true;
                const actualizarEstado = { estadoAcuerdo: estado.valor }
                // Actualizando Estado del acuerdo a 2 (Firmado)
                await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_user = ?', [actualizarEstado, id_user])
            }

        } else {
            console.log("\nNo existe la variable de sesión email o No ha solicitado el documento a firmar\n")
            estado.sinEnviar = true; // Documento sin enviar 
            estado.valor = 0;
            estado.form = true;
            dsConfig.envelopeId = ''
            acuerdoFirmado = false;
        }

        // Si no se ha solicitado el documento a firmar desde el formulario Acuerdo de Confidencialidad
    } else {
        const nuevoAcuerdo = { id_user } // Campo id_user para la tabla acuerdo_confidencial
        estado.sinEnviar = true; // Documento sin enviar 
        estado.valor = 0;
        estado.form = true; // Debe mostrar el formulario
        acuerdoFirmado = false;
        dsConfig.envelopeId = ''
        await pool.query('INSERT INTO acuerdo_confidencial SET ?', [nuevoAcuerdo], (err, result) => {
            if (err) throw err;
            console.log("1 Registro insertado");
            res.redirect('/acuerdo-de-confidencialidad')
        })
    }
    res.render('empresa/acuerdoConfidencial', { pagoDiag: true, user_dash: true, wizarx: false, tipoUser, noPago, itemActivo: 2, email, estado, acuerdoFirmado, fechaExp })
}

// Validar Acuerdo de Confidencialidad
empresaController.validarAcuerdo = async (req, res) => {
    const { id } = req.body;
    const estado = {estadoAcuerdo: 0}
    const update = await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_user = ?', [estado, id])
    let isValid = false;
    update.affectedRows > 0 ? isValid = true : isValid = isValid;
    return isValid;
}

/** Mostrar vista del Panel Diagnóstico de Negocio */
empresaController.diagnostico = async (req, res) => {
    const id_user = req.user.empresa;
    const formDiag = {}
    formDiag.id = id_user;
    formDiag.usuario = helpers.encriptarTxt('' + id_user)
    formDiag.estado = false;
    const fichaCliente = await pool.query('SELECT * FROM ficha_cliente WHERE id_user = ?', [id_user])
    const ficha = fichaCliente[0]
   
    if (fichaCliente.length == 0) {
        formDiag.color = 'badge-danger'
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
            formDiag.estilo = 'linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%); color: #FFFF'
            formDiag.texto = 'Completado'
            formDiag.estado = true;
        }
    }

    res.render('empresa/diagnostico', { user_dash: true, pagoDiag: true, itemActivo: 3, acuerdoFirmado: true, formDiag, actualYear: req.actualYear })
}

/** Mostrar vista del formulario Ficha Cliente */
empresaController.validarFichaCliente = async (req, res) => {
    const { id } = req.params;
    const id_user = helpers.desencriptarTxt(id)
    if (req.user.empresa == id_user) {
        req.session.fichaCliente = true
    } else {
        req.session.fichaCliente = false
    }
    res.redirect('/ficha-cliente')
}

empresaController.fichaCliente = async (req, res) => {
    req.session.fichaCliente = false
    const id_user = req.user.empresa, datos = {};
    const fichaCliente = await pool.query('SELECT * FROM ficha_cliente WHERE id_user = ?', [id_user])
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

    res.render('empresa/fichaCliente', { ficha, datos, fechaMaxima, wizarx: true, user_dash: false })
}

empresaController.addFichaCliente = async (req, res) => {
    let { nombres, apellidos, email, telefono, fecha_nacimiento, pais, twitter, facebook, instagram, otra, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivo1, objetivo2, objetivo3, fortaleza1, fortaleza2, fortaleza3, problema1, problema2, problema3, motivo_consultoria, fecha_zh } = req.body
    let redes_sociales = JSON.stringify({ twitter, facebook, instagram, otra })
    let objetivos = JSON.stringify({ objetivo1, objetivo2, objetivo3 })
    let fortalezas = JSON.stringify({ fortaleza1, fortaleza2, fortaleza3 })
    let problemas = JSON.stringify({ problema1, problema2, problema3 })

    es_propietario != undefined ? es_propietario : es_propietario = 'No'
    socios != undefined ? socios : socios = 'No'
    const id_user = req.user.empresa;
    cantidad_socios == null ? cantidad_socios = 0 : cantidad_socios = cantidad_socios;

    const fecha_modificacion = new Date().toLocaleString("en-US", {timeZone: fecha_zh})

    const nuevaFichaCliente = {
        telefono, fecha_nacimiento, pais, redes_sociales, es_propietario, socios, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivos, fortalezas, problemas, motivo_consultoria, id_user, fecha_modificacion
    }

    const userUpdate = { nombres, apellidos, nombre_empresa, email }

    // Actualizando datos bases de la empresa
    await pool.query('UPDATE users SET ? WHERE id = ?', [userUpdate, id_user])

    // Consultar si ya existen datos en la Base de datos
    const ficha = await pool.query('SELECT * FROM ficha_cliente WHERE id_user = ?', [id_user])
    if (ficha.length > 0) {
        await pool.query('UPDATE ficha_cliente SET ? WHERE id_user = ?', [nuevaFichaCliente, id_user])
    } else {
        await pool.query('INSERT INTO ficha_cliente SET ?', [nuevaFichaCliente])
    }
    // JSON.parse(redes_sociales) // CONVERTIR  JSON A UN OBJETO
    res.redirect('/diagnostico-de-negocio')
}

empresaController.eliminarFicha = async (req, res) => {
    const { id } = req.body;
    const ficha = await pool.query('DELETE FROM ficha_cliente WHERE id_user = ?', [id])
    let respu = undefined;
    console.log(ficha.affectedRows)
    if (ficha.affectedRows > 0) {
        console.log("Eliminando ficha cliente")
        respu = true;
    } else {
        respu = false;
    }
    res.send(respu)
}