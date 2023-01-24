const pagosController = exports;
const pool = require('../database')
const { my_domain, id_producto_estrategico, clientSecretStripe } = require('../keys').config
const stripe = require('stripe')(clientSecretStripe);
const { consultarDatos } = require('../lib/helpers')

let precioDiag = 0;

/** PAGO ÚNICO - DIAGNÓSTICO DE NEGOCIO */
pagosController.pagarDiagnostico = async (req, res) => {
    console.log("URL Sesión>>> ", req.session.intentPay);

    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    let consulDiag = await consultarDatos('consultores_asignados')
    consulDiag = consulDiag.find(x => x.empresa == e.id_empresas && x.orden == 1)
    let consul = await consultarDatos('consultores')
    consul = consul.find(x => x.id_consultores == consulDiag.consultor)
    
    if (consul) {
        if (consul.nivel == '1') {
            precioDiag = 197
        } else if (consul.nivel == '2') {
            precioDiag = 297
        } else if (consul.nivel == '3') {
            precioDiag = 497
        } else if (consul.nivel == '4') {
            precioDiag = 697
        }
    }

    const precio = precioDiag + '00'
    
    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Pago Único - Diagnóstico de Negocio',
                        images: ['https://3csigma.com/app_public_files/img/diagnostico-de-negocio-pay.png'],
                    },
                    unit_amount: parseFloat(precio),
                },
                quantity: 1,
                description: '✓ Sesión online 1:1 con un Consultor de Negocio. ✓ Estudio global de su proyecto o empresa. ✓ Aplicación del Método PAOM. ✓ Recomendaciones estratégicas. ✓ Sesión de preguntas y respuestas ✓ Informe de Resultados.'
            },
        ],
        mode: 'payment',
    });

    req.session.intentPay = session.url;
    req.session.payDg0 = true;
    res.redirect(303, session.url);
}

/** PAGO ÚNICO - ANÁLISIS DE NEGOCIO */
pagosController.pagarAnalisisCompleto = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Análisis de negocio')
    let precio = 0;
    if (pay) {
        precio = pay.precio_total + '00'
        precio = (parseFloat(precio*0.9))
        console.log("Precio => ", precio)
    }

    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Pago Único - Análisis de Negocio',
                        images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                    },
                    unit_amount: precio,
                },
                quantity: 1,
                description: `Análisis y Evaluación dimensión producto. 
                - Análisis y Evaluación dimensión administración.   
                - Análisis y Evaluación dimensión Operaciones. 
                - Análisis y Evaluación dimensión Marketing.`
            },
        ],
        mode: 'payment',
    });

    console.log("RESPUESTA STRIPE SESSION", session.url)
    req.session.intentPay = session.url;
    req.session.payDg0 = false;
    req.session.analisis0 = true;
    req.session.analisis1 = false;
    req.session.analisis2 = false;
    req.session.analisis3 = false;
    res.redirect(303, session.url);
}

/************** PAGOS DIVIDOS ANÁLIS DE NEGOCIO ****************/
/** PAGO 1 - PORCENTAJE 60% */
pagosController.pagarAnalisis_parte1 = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Análisis de negocio')
    let precio = 0;
    if (pay) {
        precio = pay.precio_per1 + ''
        if (precio.includes('.')) {
            precio = precio.split('.')
            precio = precio[0] + '' + precio[1]
            precio = precio + '0'
        } else {
            precio = precio + '00'
        }
        precio = parseInt(precio)
    }

    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Pago primera cuota - Análisis de Negocio',
                        images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                    },
                    unit_amount: precio,
                },
                quantity: 1,
                description: `Análisis y Evaluación dimensión producto. 
                - Análisis y Evaluación dimensión administración.   
                - Análisis y Evaluación dimensión Operaciones. 
                - Análisis y Evaluación dimensión Marketing.`
            },
        ],
        mode: 'payment',
    });

    console.log("RESPUESTA STRIPE SESSION", session.url)
    req.session.intentPay = session.url;
    req.session.payDg0 = false;
    req.session.analisis0 = false;
    req.session.analisis1 = true;
    req.session.analisis2 = false;
    req.session.analisis3 = false;
    res.redirect(303, session.url);
}

/** PAGO 2 - PORCENTAJE 20% */
pagosController.pagarAnalisis_parte2 = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Análisis de negocio')
    let precio = 0;
    if (pay) {
        precio = pay.precio_per2 + ''
        if (precio.includes('.')) {
            precio = precio.split('.')
            precio = precio[0] + '' + precio[1]
            precio = precio + '0'
        } else {
            precio = precio + '00'
        }
        precio = parseInt(precio)
    }

    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Pago segunda cuota - Análisis de Negocio',
                        images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                    },
                    unit_amount: precio,
                },
                quantity: 1,
                description: `Análisis y Evaluación dimensión producto. 
                - Análisis y Evaluación dimensión administración.   
                - Análisis y Evaluación dimensión Operaciones. 
                - Análisis y Evaluación dimensión Marketing.`
            },
        ],
        mode: 'payment',
    });


    console.log("RESPUESTA STRIPE SESSION", session.url)
    req.session.intentPay = session.url;
    req.session.payDg0 = false;
    req.session.analisis0 = false;
    req.session.analisis1 = false;
    req.session.analisis2 = true;
    req.session.analisis3 = false;
    res.redirect(303, session.url);
}

/** PAGO 3 - PORCENTAJE 20% */
pagosController.pagarAnalisis_parte3 = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Análisis de negocio')
    let precio = 0;
    if (pay) {
        precio = pay.precio_per3 + ''
        if (precio.includes('.')) {
            precio = precio.split('.')
            precio = precio[0] + '' + precio[1]
            precio = precio + '0'
        } else {
            precio = precio + '00'
        }
        precio = parseInt(precio)
    }

    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Pago tercera cuota - Análisis de Negocio',
                        images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                    },
                    unit_amount: precio,
                },
                quantity: 1,
                description: `Análisis y Evaluación dimensión producto. 
                - Análisis y Evaluación dimensión administración.   
                - Análisis y Evaluación dimensión Operaciones. 
                - Análisis y Evaluación dimensión Marketing.`
            },
        ],
        mode: 'payment',
    });


    console.log("RESPUESTA STRIPE SESSION", session.url)
    req.session.intentPay = session.url;
    req.session.payDg0 = false;
    req.session.analisis0 = false;
    req.session.analisis1 = false;
    req.session.analisis2 = false;
    req.session.analisis3 = true;
    res.redirect(303, session.url);
}

pagosController.pagarPlanEstrategico = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Plan estratégico')
    let precio = pay.precio_total + '00';
    precio = parseFloat(precio)

    const price = await stripe.prices.create({
        unit_amount: precio,
        currency: 'usd',
        recurring: {interval: 'month'},
        product: `${id_producto_estrategico}`,
    });

    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        mode: 'subscription',
        line_items: [{
            price: price.id,
            quantity: 1
        }],
    });

    req.session.idSesion = session.id
    req.session.intentPay = session.url;
    req.session.payDg0 = req.session.analisis0 = req.session.analisis1 = req.session.analisis2 = req.session.analisis3 = false;
    req.session.planEstrategico = true;
    res.redirect(303, session.url);
}

pagosController.cancelarSub = async (req, res) => {
    const { empresa, id_sub } = req.body;
    console.log("\nID de la Sub: " + id_sub)
    const subscription = await stripe.subscriptions.retrieve(id_sub);
    console.log("\n>>> INFO SUB RECUPERADA : ", subscription)

    // Cancelar suscripción al final del ciclo 
    const subCancel = await stripe.subscriptions.update(id_sub, {cancel_at_period_end: true});
    console.log("\nSub Cancelada: ", subCancel)
    console.log("-----------\n")
    console.log("\n>>> INFO SUB RECUPERADA : ", subscription)
    const fecha = new Date().toLocaleDateString("en-US")
    const actualizar = { estrategico: JSON.stringify({ estado: 2, fecha, subscription: id_sub }) }
    await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, empresa])
    res.send(true)
}

/********************************************************************/
pagosController.pagoExitoso = async (req, res) => {
    let pagoEtapa1_ok = false, pagoEtapa2_ok = false, pagoEtapa3_ok = false;
    req.session.intentPay = undefined;

    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;

    /** Consultando que pagos ha realizado la empresa */
    const pagos = await consultarDatos('pagos')
    const pago = pagos.find(x => x.id_empresa == id_empresa)

    if (pago) {
        const fecha = new Date().toLocaleDateString("en-US")
        if (req.session.payDg0) {
            const actualizar = { diagnostico_negocio: JSON.stringify({ estado: 1, fecha, precio: '$'+precioDiag }) }
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, id_empresa])
            pagoEtapa1_ok = true
        }

        let actualizarAnalisis = undefined;
        let pagoAnalisis = { estado: 1, fecha }
        if (req.session.analisis0) {
            pagoAnalisis.estado = 1;
            actualizarAnalisis = {
                analisis_negocio: JSON.stringify(pagoAnalisis),
                analisis_negocio1: JSON.stringify({ estado: 0 })
            }
        } else if (req.session.analisis1) {
            pagoAnalisis.estado = 2;
            actualizarAnalisis = { analisis_negocio1: JSON.stringify(pagoAnalisis) }
        } else if (req.session.analisis2) {
            pagoAnalisis.estado = 2;
            actualizarAnalisis = { analisis_negocio2: JSON.stringify(pagoAnalisis) }
        } else if (req.session.analisis3) {
            pagoAnalisis.estado = 2;
            actualizarAnalisis = { analisis_negocio3: JSON.stringify(pagoAnalisis) }
        } 

        if (actualizarAnalisis != undefined) {
            pagoEtapa1_ok = false
            pagoEtapa2_ok = true;
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        }
        
        if (req.session.planEstrategico) {
            const idSession = req.session.idSesion;
            const dataSession = await stripe.checkout.sessions.retrieve(idSession);
            const actualizar = { estrategico: JSON.stringify({ estado: 1, fecha, subscription: dataSession.subscription }) }
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, id_empresa])
            pagoEtapa1_ok = false;
            pagoEtapa2_ok = false;
            pagoEtapa3_ok = true;
        }

    }

    res.render('empresa/dashboard', {
        pagoEtapa1_ok, pagoEtapa2_ok, pagoEtapa3_ok,
        user_dash: true, wizarx: false, login: false,
        itemDashboard: true,
    })
}

pagosController.pagoCancelado = async (req, res) => {
    let destino = 'empresa/dashboard';
    req.session.intentPay = undefined;
    req.session.payDg0 = false;
    req.session.analisis0 = false;
    req.session.analisis1 = false;
    req.session.analisis2 = false;
    req.session.analisis3 = false;

    res.render(destino, {
        alertCancel: true,
        user_dash: true, wizarx: false, login: false,
        itemDashboard: true,
    })
}