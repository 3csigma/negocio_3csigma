const pool = require('../database')
const empresaController = exports;
const dsConfig = require('../config/index.js').config;
const { listEnvelope } = require('./listEnvelopes');
const helpers = require('../lib/helpers')
const { Country } = require('country-state-city')

let acuerdoFirmado = false, pagoPendiente = true, diagnosticoPagado = 0, analisisPagado = 0, etapa1;

/** Función para mostrar Dashboard de Empresas */
empresaController.index = async (req, res) => {
    diagnosticoPagado = 0;
    acuerdoFirmado = false;
    req.intentPay = undefined; // Intento de pago
    const empresa = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
    const id_empresa = empresa[0].id_empresas;
    req.pagoDiag = false, pagoDiag = false, etapa1 = {};

    /** Consultando que pagos ha realizado el usuario */
    const pagos = await pool.query('SELECT * FROM pagos WHERE id_empresa = ?', [id_empresa])
    if (pagos.length == 0) {
        diagnosticoPagado = 0;
        const nuevoPago = { id_empresa }
        await pool.query('INSERT INTO pagos SET ?', [nuevoPago])
    }

    if (pagos[0].diagnostico_negocio == 1) {
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
    pagos[0].analisis_negocio == '1' ? analisisPagado = 1 : analisisPagado = analisisPagado;

    // VALIDANDO SI PUEDE O NO AGENDAR UNA CITA CON EL CONSULTOR
    if (empresa[0].consultor != null) {
        etapa1.lista = true;
        let c = await pool.query('SELECT * FROM consultores WHERE id_consultores = ? LIMIT 1', [empresa[0].consultor]);
        c = c[0];
        // let nom = c.email.split('@')
        // nom = nom[0] + ''
        etapa1.consultor = c.usuario_calendly;
        console.log("DATOS AGENDAR CITA");

    }

    /** ETAPAS DEL DIAGNOSTICO EN LA EMPRESA */
    let dataEmpresa = await pool.query('SELECT e.*, u.codigo, u.estadoAdm, f.telefono, f.id_empresa, p.id_empresa, p.diagnostico_negocio, p.analisis_negocio, a.id_empresa, a.estadoAcuerdo FROM empresas e LEFT OUTER JOIN ficha_cliente f ON f.id_empresa = ? LEFT OUTER JOIN pagos p ON p.id_empresa = ? LEFT OUTER JOIN acuerdo_confidencial a ON a.id_empresa = ? INNER JOIN users u ON u.codigo = ? AND rol = "Empresa" LIMIT 1', [id_empresa,id_empresa,id_empresa,empresa[0].codigo])
    dataEmpresa = dataEmpresa[0]

    let diagEmpresa = await pool.query('SELECT * FROM dg_empresa_establecida WHERE id_empresa = ? LIMIT 1', [empresa[0].id_empresas])
    let diagEmpresa2 = await pool.query('SELECT * FROM dg_empresa_nueva WHERE id_empresa = ? LIMIT 1', [empresa[0].id_empresas])
    const diagPorcentaje = {}, anaPorcentaje = {};
    
    // Etapa 1
    let porcentaje = 100/8
    // porcentaje = porcentaje.toFixed(2)
    porcentaje = porcentaje.toFixed(0)
    diagPorcentaje.txt = 'Email sin confirmar';
    diagPorcentaje.num = porcentaje

    if (dataEmpresa.estadoEmail == 1){
        diagPorcentaje.txt = 'Email confirmado';
        diagPorcentaje.num = porcentaje*2
    } 
    if (dataEmpresa.diagnostico_negocio == 1){
        diagPorcentaje.txt = 'Diagnóstico pagado'
        diagPorcentaje.num = porcentaje*3
    }
    if (dataEmpresa.estadoAcuerdo == 1){
        diagPorcentaje.txt = 'Acuerdo enviado'
        diagPorcentaje.num = porcentaje*4
    }
    if (dataEmpresa.estadoAcuerdo == 2){
        diagPorcentaje.txt = 'Acuerdo firmado'
        diagPorcentaje.num = porcentaje*5
    } 
    if (dataEmpresa.telefono){
        diagPorcentaje.txt = 'Ficha Cliente'
        diagPorcentaje.num = porcentaje*6
    }

    if (diagEmpresa.length > 0 || diagEmpresa2.length > 0){
        diagPorcentaje.txt = 'Cuestionario diagnóstico'
        diagPorcentaje.num = porcentaje*7
    }

    // Informe de la empresa subido
    let informeEmpresa = await pool.query('SELECT * FROM informes WHERE id_empresa = ? LIMIT 1', [empresa[0].id_empresas])
    informeEmpresa.length > 0 ? diagPorcentaje.num = 100 : diagPorcentaje.num = diagPorcentaje.num;
    // console.log("\n<<< Porcentaje actual >>>");
    // console.log(diagPorcentaje);

    // Etapa 2
    anaPorcentaje.txt = 'Análisis no pagado';
    anaPorcentaje.num = 0;
    if (dataEmpresa.analisis_negocio == 1){
        anaPorcentaje.txt = 'Análisis pagado'
        anaPorcentaje.num = 0;
    }
    
    /************************************************************************** */

    /************** DATOS PARA LAS GRÁFICAS AREAS VITALES & POR DIMENSIONES ****************/
    let jsonAnalisis1, jsonAnalisis2;
    let areasVitales = await pool.query('SELECT * FROM indicadores_areasvitales WHERE id_empresa = ? ORDER BY id_ LIMIT 2', [empresa[0].id_empresas])

    if (areasVitales.length > 0) {
        jsonAnalisis1 = JSON.stringify(areasVitales[0]);
        jsonAnalisis2 =JSON.stringify( areasVitales[1]);
    }

    let jsonDimensiones1, jsonDimensiones2, nuevosProyectos = 0, rendimiento = {};
    // Si la empresa está Establecida
    let xDimensiones = await pool.query('SELECT * FROM indicadores_dimensiones WHERE id_empresa = ? ORDER BY id ASC LIMIT 1', [empresa[0].id_empresas])
    let xDimensiones2 = await pool.query('SELECT * FROM indicadores_dimensiones WHERE id_empresa = ? ORDER BY id DESC LIMIT 1', [empresa[0].id_empresas])
    if (xDimensiones.length > 0) {
        jsonDimensiones1 = JSON.stringify(xDimensiones[0]);
        jsonDimensiones2 = JSON.stringify( xDimensiones2[0]);
    }

    // Si la empresa es Nueva
    let resCategorias = await pool.query('SELECT * FROM resultado_categorias WHERE id_empresa = ? LIMIT 1', [empresa[0].id_empresas])
    if (resCategorias.length > 0) {
        jsonDimensiones1 = JSON.stringify(resCategorias[0]);
        nuevosProyectos = 1;
        // Rendimiento del Proyecto
        rendimiento.num = resCategorias[0].rendimiento
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

    /************************************************************************************* */

    res.render('pages/dashboard', {
        user_dash: true,
        pagoPendiente,
        diagnosticoPagado,
        analisisPagado,
        pagoDiag,
        itemActivo: 1,
        acuerdoFirmado,
        etapa1,
        diagPorcentaje,
        jsonAnalisis1, jsonAnalisis2, jsonDimensiones1, jsonDimensiones2,
        informe: informeEmpresa[0],
        nuevosProyectos, rendimiento
    })

}

/** Creación & validación del proceso Acuerdo de Confidencialidad */
empresaController.acuerdo = async (req, res) => {
    /**
     * Estados (Acuerdo de Confidencialidad):
     * Sin enviar: 0, Enviado: 1, Firmado: 2
     */
    const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
    const id_empresa = row[0].id_empresas;
    const tipoUser = req.user.rol;
    let estado = {}, email, statusSign = '';
    const acuerdo = await pool.query('SELECT * FROM acuerdo_confidencial WHERE id_empresa = ?', [id_empresa])

    if (acuerdo.length > 0) {
        // console.log("ARGS DATABASE >>>> ", JSON.parse(acuerdo[0].args))
        /** Validando si ya está firmado el documento y su estado de firmado (2) se encuentra en la base de datos */
        if (acuerdo[0].estadoAcuerdo == 2) {
            estado.valor = 2; //Documento Firmado
            estado.firmado = true;
            acuerdoFirmado = true;
            estado.sinEnviar = false; // Documento sin enviar 
            estado.form = false;
            estado.enviado = false;

        } else if (acuerdo[0].estadoAcuerdo == 1) { // Validando desde Base de datos
            acuerdoFirmado = false;
            estado.valor = 1; // Documento enviado
            estado.form = true; // Debe mostrar el formulario
            estado.enviado = true;
            estado.firmado = false;
            estado.sinEnviar = false; // Documento sin enviar 

            email = acuerdo[0].email_signer;
            const args = JSON.parse(acuerdo[0].args) // CONVERTIR  JSON A UN OBJETO
            const newToken = await helpers.authToken() //Generando nuevo Token para enviar a Docusign
            args.accessToken = newToken.access_token;
            const new_args = { args: JSON.stringify(args) }

            await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_empresa = ?', [new_args, id_empresa])

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
                estado.sinEnviar = false; // Documento sin enviar 
                estado.form = false;
                estado.enviado = false;

                const actualizarEstado = { estadoAcuerdo: estado.valor }
                // Actualizando Estado del acuerdo a 2 (Firmado)
                await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_empresa = ?', [actualizarEstado, id_empresa])
            }

        } else {
            console.log("\nNo existe la variable de sesión email o No ha solicitado el documento a firmar\n")
            estado.sinEnviar = true; // Documento sin enviar 
            estado.valor = 0;
            estado.form = true;
            dsConfig.envelopeId = ''
            acuerdoFirmado = false;
            estado.enviado = false;
        }

        // Si no se ha solicitado el documento a firmar desde el formulario Acuerdo de Confidencialidad
    } else {
        const nuevoAcuerdo = { id_empresa } // Campo id_empresa para la tabla acuerdo_confidencial
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

    res.render('empresa/acuerdoConfidencial', { pagoDiag: true, user_dash: true, wizarx: false, tipoUser, itemActivo: 2, email, estado, acuerdoFirmado, etapa1 })
}

/** Mostrar vista del Panel Diagnóstico de Negocio */
empresaController.diagnostico = async (req, res) => {
    const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
    const id_empresa = row[0].id_empresas;
    const formDiag = {}
    formDiag.id = id_empresa;
    formDiag.usuario = helpers.encriptarTxt('' + id_empresa)
    formDiag.estado = false;
    const fichaCliente = await pool.query('SELECT * FROM ficha_cliente WHERE id_empresa = ?', [id_empresa])
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

    // Informe de la empresa subido
    let informeEmpresa = await pool.query('SELECT * FROM informes WHERE id_empresa = ? LIMIT 1', [id_empresa])

    res.render('empresa/diagnostico', {
        user_dash: true, pagoDiag: true, itemActivo: 3, acuerdoFirmado: true, formDiag,
        actualYear: req.actualYear,
        etapa1, informe: informeEmpresa[0]
    })
}

/** Mostrar vista del formulario Ficha Cliente */
empresaController.validarFichaCliente = async (req, res) => {
    const { id } = req.params;
    let row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
    row = row[0]
    const id_empresa = helpers.desencriptarTxt(id)
    if (row.id_empresas == id_empresa) {
        req.session.fichaCliente = true
    } else {
        req.session.fichaCliente = false
    }
    res.redirect('/ficha-cliente')
}

empresaController.fichaCliente = async (req, res) => {
    req.session.fichaCliente = false
    const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
    const empresa = row[0]
    const id_empresa = row[0].id_empresas, datos = {};
    const fichaCliente = await pool.query('SELECT * FROM ficha_cliente WHERE id_empresa = ?', [id_empresa])
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

    res.render('empresa/fichaCliente', { ficha, datos, fechaMaxima, wizarx: true, user_dash: false, empresa })
}

empresaController.addFichaCliente = async (req, res) => {
    let { nombres, apellidos, email, telefono, fecha_nacimiento, pais, twitter, facebook, instagram, otra, es_propietario, socios, nombre_empresa, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivo1, objetivo2, objetivo3, fortaleza1, fortaleza2, fortaleza3, problema1, problema2, problema3, motivo_consultoria, fecha_zh } = req.body
    let redes_sociales = JSON.stringify({ twitter, facebook, instagram, otra })
    let objetivos = JSON.stringify({ objetivo1, objetivo2, objetivo3 })
    let fortalezas = JSON.stringify({ fortaleza1, fortaleza2, fortaleza3 })
    let problemas = JSON.stringify({ problema1, problema2, problema3 })

    es_propietario != undefined ? es_propietario : es_propietario = 'No'
    socios != undefined ? socios : socios = 'No'
    const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
    const id_empresa = row[0].id_empresas;
    cantidad_socios == null ? cantidad_socios = 0 : cantidad_socios = cantidad_socios;

    const fecha_modificacion = new Date().toLocaleString("en-US", { timeZone: fecha_zh })

    const nuevaFichaCliente = {
        telefono, fecha_nacimiento, pais, redes_sociales, es_propietario, socios, cantidad_socios, porcentaje_accionario, tiempo_fundacion, tiempo_experiencia, promedio_ingreso_anual, num_empleados, page_web, descripcion, etapa_actual, objetivos, fortalezas, problemas, motivo_consultoria, id_empresa, fecha_modificacion
    }

    const userUpdate = { nombres, apellidos, nombre_empresa, email }

    // Actualizando datos bases de la empresa
    await pool.query('UPDATE empresas SET ? WHERE id_empresas = ?', [userUpdate, id_empresa])

    // Consultar si ya existen datos en la Base de datos
    const ficha = await pool.query('SELECT * FROM ficha_cliente WHERE id_empresa = ?', [id_empresa])
    if (ficha.length > 0) {
        await pool.query('UPDATE ficha_cliente SET ? WHERE id_empresa = ?', [nuevaFichaCliente, id_empresa])
    } else {
        await pool.query('INSERT INTO ficha_cliente SET ?', [nuevaFichaCliente])
    }
    // JSON.parse(redes_sociales) // CONVERTIR  JSON A UN OBJETO
    res.redirect('/diagnostico-de-negocio')
}

empresaController.eliminarFicha = async (req, res) => {
    const { id } = req.body;
    const ficha = await pool.query('DELETE FROM ficha_cliente WHERE id_empresa = ?', [id])
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