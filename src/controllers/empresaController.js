const pool = require('../database')
const empresaController = exports;
const dsConfig = require('../config/index.js').config;
const { listEnvelope } = require('./listEnvelopes');
const helpers = require('../lib/helpers')

let acuerdoFirmado = false, pagoPendiente = true, diagnosticoPagado = 0, analisisPagado = 0;

/** Función para mostrar Dashboard & validación dependiendo del usuario */
empresaController.dashboard = async (req, res) => {
    req.intentPay = undefined; // Intento de pago
    // console.log("Signer Email Global >>>> ", dsConfig.envelopeId)
    const tipoUser = req.user.rol;
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
            if (acuerdo[0].estado == 2) {
                acuerdoFirmado = true;
                noPago = false;
            }
        }
    }

    console.log("** ¿ACUERDO FIRMADO? ==> ", acuerdoFirmado)
    console.log("** ¿USUARIO PAGÓ DIAGNOSTICO? ==> ", diagnosticoPagado)
    console.log("** ¿USUARIO PAGÓ ANÁLISIS? ==> ", analisisPagado)
    res.render('dashboard', {
        dashx: true, wizarx: false, tipoUser, pagoPendiente, diagnosticoPagado, analisisPagado, pagoDiag, itemActivo: 1, acuerdoFirmado
    })
    // res.send("HOLA DESDE DASHBOARD")
}

// Función para validar el Pago del Diagnóstico de Negocio
empresaController.pagoDiagnostico = async (req, res) => {
    console.log("Pago para Activar Diagnóstico de Negocio")
}

/** Creación & validación del proceso Acuerdo de Confidencialidad */
empresaController.acuerdo = async (req, res) => {
    /**
     * Estados (Acuerdo de Confidencialidad):
     * Sin enviar: 0, Enviado: 1, Firmado: 2
     */
    const id_user = req.user.id;
    const tipoUser = req.user.rol;
    let estado = {}, email, noPago = true, statusSign = '';
    const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_user = ?', [id_user])

    if (acuerdo.length > 0) {
        // console.log("ARGS DATABASE >>>> ", JSON.parse(acuerdo[0].args))
        noPago = false;
        /** Validando si ya está firmado el documento y su estado de firmado (2) se encuentra en la base de datos */
        if (acuerdo[0].estado == 2) {
            acuerdoFirmado = true;
            estado.valor = 2; //Documento Firmado
            estado.firmado = true;
            dsConfig.envelopeId = ''
        } else if (acuerdo[0].estado == 1) { // Validando desde Docusign
            noPago = false;
            email = acuerdo[0].email_signer;
            const args = JSON.parse(acuerdo[0].args) // CONVERTIR  JSON A UN OBJETO

            /** Consultando el estado del documento en Docusign */
            await listEnvelope(args, acuerdo[0].envelopeId).then((values) => {
                statusSign = values.envelopes[0].status //Capturando el estado desde Docusign
                // console.log("STATUS DOCUMENT FROM DOCUSIGN ==> ", statusSign) // sent or completed
            })

            /** Validando si el estado devuelto es enviado o firmado */
            if (statusSign == 'completed') { // Estado desde docusign (completed)
                estado.valor = 2; //Documento Firmado
                estado.firmado = true;
                acuerdoFirmado = true;
                const actualizarEstado = { estado: estado.valor }
                // Actualizando Estado del acuerdo a 2 (Firmado)
                await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_user = ?', [actualizarEstado, id_user])
            } else {
                estado.valor = 1; // Documento enviado
                estado.form = true; // Debe mostrar el formulario
                estado.enviado = true;
            }
        } else {
            console.log("No existe la variable de sesión email o No ha solicitado el documento a firmar")
            estado.sinEnviar = true; // Documento sin enviar 
            estado.valor = 0;
            estado.form = true;
            dsConfig.envelopeId = ''
        }

        // Si no se ha solicitado el documento a firmar desde el formulario Acuerdo de Confidencialidad
    } else {
        const nuevoAcuerdo = { id_user } // Campo id_user para la tabla acuerdo_confidencial
        estado.sinEnviar = true; // Documento sin enviar 
        estado.valor = 0;
        estado.form = true; // Debe mostrar el formulario
        dsConfig.envelopeId = ''
        await pool.query('INSERT INTO acuerdo_confidencial SET ?', [nuevoAcuerdo], (err, result) => {
            if (err) throw err;
            console.log("1 Registro insertado");
            res.redirect('/acuerdo-de-confidencialidad')
        })
    }
    res.render('empresa/acuerdoConfidencial', { dashx: true, wizarx: false, tipoUser, noPago, itemActivo: 2, email, estado, acuerdoFirmado })
}

/** Mostrar vista del Panel Diagnóstico de Negocio */
empresaController.diagnostico = async (req, res) => {
    const id_user = req.user.id;
    const tipoUser = req.user.rol;
    const formDiag = {}
    formDiag.usuario = helpers.encriptarTxt(''+id_user)
    formDiag.fecha = new Date().toLocaleDateString("en-US")

    const ficha = await pool.query('SELECT * FROM ficha_cliente WHERE id_user = ?', [id_user])
    if (ficha.length == 0) {
        formDiag.color = 'badge-danger'
        formDiag.texto = 'Pendiente'
    } else{
        if (ficha[0].page_web == ''){
            formDiag.color = 'badge-warning'
            formDiag.texto = 'Incompleto'
        } else {
            formDiag.color = 'badge-success'
            formDiag.estilo = 'linear-gradient(189.55deg, #FED061 -131.52%, #812082 -11.9%, #50368C 129.46%); color: #FFFF'
            formDiag.texto = 'Completado'
        }
    }

    res.render('empresa/diagnostico', { dashx: true, tipoUser, itemActivo: 3, acuerdoFirmado, formDiag })
}

/** Mostrar vista del formulario Ficha Cliente */
empresaController.validarFichaCliente = async (req, res) => {
    const { id } = req.params;
    const id_user = helpers.desencriptarTxt(id)
    if (req.user.id == id_user) {
        req.session.fichaCliente = true
    } else {
        req.session.fichaCliente = false
    }
    res.redirect('/ficha-cliente')
}

empresaController.fichaCliente = async (req, res) => {
    req.session.fichaCliente = false
    const id_user = req.user.id
    const fichaCliente = await pool.query('SELECT * FROM ficha_cliente WHERE id_user = ?', [id_user])
    // JSON.parse(redes_sociales) // CONVERTIR  JSON A UN OBJETO
    const datos = {}
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
        
    }
    console.log("DESCRIPCION >>", datos.descripcion)

    res.render('empresa/fichaCliente', {ficha, datos, wizarx: true, dashx: false})
}

empresaController.addFichaCliente = async (req, res) => {
    let { nombre, apellido, email, telefono, fecha_nacimiento, pais, twitter, facebook, instagram, otra, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivo1, objetivo2, objetivo3, fortaleza1, fortaleza2, fortaleza3, problema1, problema2, problema3, motivo_consultoria } = req.body

    let redes_sociales = JSON.stringify({ twitter, facebook, instagram, otra })
    let objetivos = JSON.stringify({ objetivo1, objetivo2, objetivo3 })
    let fortalezas = JSON.stringify({ fortaleza1, fortaleza2, fortaleza3 })
    let problemas = JSON.stringify({ problema1, problema2, problema3 })

    es_propietario != undefined ? es_propietario : es_propietario = 'No'
    socios != undefined ? socios : socios = 'No'
    const id_user = req.user.id;

    const newFichaCliente = {
        nombre, apellido, email, telefono, fecha_nacimiento, pais, redes_sociales, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivos, fortalezas, problemas, motivo_consultoria, id_user
    }
    
    // Consultar si ya existen datos en la Base de datos
    const ficha = await pool.query('SELECT * FROM ficha_cliente WHERE id_user = ?', [id_user])
    if (ficha.length > 0) {
        await pool.query('UPDATE ficha_cliente SET ? WHERE id_user = ?', [newFichaCliente, id_user])
    } else {
        await pool.query('INSERT INTO ficha_cliente SET ?', [newFichaCliente])
    }
    // JSON.parse(redes_sociales) // CONVERTIR  JSON A UN OBJETO
    res.redirect('/diagnostico-de-negocio')
}

empresaController.editar = async (req, res) => {
    const { id } = req.params
    const ficha = await pool.query('SELECT * FROM ficha_cliente WHERE id = ?', [id])
    res.render('empresa/fichaCliente', { ficha: ficha[0] })
}

empresaController.actualizado = async (req, res) => {
    const { id } = req.params
    const updateFicha = {} // Los datos a modificar
    await pool.query('UPDATE ficha_cliente SET ? WHERE id = ?', [updateFicha, id])
    res.render('empresa/fichaCliente', { ficha: ficha[0] })
}

// Función para validar el Pago del Análisis de Negocio
empresaController.pagoAnalisis = async (req, res) => {
    console.log("Pago para Activar Análisis de Negocio")
}