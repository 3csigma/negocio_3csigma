const pagosController = exports;
const pool = require('../database')
const stripe = require('stripe')(process.env.CLIENT_SECRET_STRIPE);
const { consultarDatos } = require('../lib/helpers')
const my_domain = process.env.MY_DOMAIN
const id_producto_estrategico = process.env.ID_PRODUCTO_ESTRATEGICO

let precioDiag = 0, precioE2 = 0, precioE3 = 0;

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
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: parseFloat(precio),
                product_data: {
                    name: 'Pago Único - Diagnóstico de Negocio',
                    images: ['https://3csigma.com/app_public_files/img/diagnostico-de-negocio-pay.png'],
                },
            },
            quantity: 1,
            description: '✓ Sesión online 1:1 con un Consultor de Negocio. ✓ Estudio global de su proyecto o empresa. ✓ Aplicación del Método PAOM. ✓ Recomendaciones estratégicas. ✓ Sesión de preguntas y respuestas ✓ Informe de Resultados.'
            }],
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
        precio = (parseFloat(pay.precio_total*0.9))
        precioE2 = precio;
        precio = precio + '00'
        console.log("Precio => ", precio)
    }

    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: precio,
                product_data: {
                    name: 'Pago Único - Análisis de Negocio',
                    images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                },
            },
            quantity: 1,
            description: `Análisis y Evaluación dimensión producto. 
            - Análisis y Evaluación dimensión administración.   
            - Análisis y Evaluación dimensión Operaciones. 
            - Análisis y Evaluación dimensión Marketing.`
        }],
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
        precioE2 = precio;
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
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: precio,
                product_data: {
                    name: 'Pago primera cuota - Análisis de Negocio',
                    images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                },
            },
            quantity: 1,
            description: `Análisis y Evaluación dimensión producto. 
            - Análisis y Evaluación dimensión administración.   
            - Análisis y Evaluación dimensión Operaciones. 
            - Análisis y Evaluación dimensión Marketing.`
        }],
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
        precioE2 = precio;
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
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: precio,
                product_data: {
                    name: 'Pago segunda cuota - Análisis de Negocio',
                    images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                },
            },
            quantity: 1,
            description: `Análisis y Evaluación dimensión producto. 
            - Análisis y Evaluación dimensión administración.   
            - Análisis y Evaluación dimensión Operaciones. 
            - Análisis y Evaluación dimensión Marketing.`
        }],
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
        precioE2 = precio;
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
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: precio,
                product_data: {
                    name: 'Pago tercera cuota - Análisis de Negocio',
                    images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                },
            },
            quantity: 1,
            description: `Análisis y Evaluación dimensión producto. 
            - Análisis y Evaluación dimensión administración.   
            - Análisis y Evaluación dimensión Operaciones. 
            - Análisis y Evaluación dimensión Marketing.`
        }],
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

/** PAGO ÚNICO - PLAN EMPRESARIAL */
pagosController.pagarEmpresarialCompleto = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Plan empresarial')
    let precio = 0;
    if (pay) {
        precio = (parseFloat(pay.precio_total*0.9))
        precioE3 = precio;
        precio = precio + '00'
        console.log("Precio => ", precio)
    }

    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: precio,
                product_data: {
                    name: 'Pago Único - Plan Empresarial',
                    images: ['https://3csigma.com/app_public_files/img/Plan-Empresarial-Stripe.png'],
                },
            },
            quantity: 1,
            description: `Establecer las Actividades a desarrollar, las pautas pertinentes para cada área vital y escalar tu negocio.`
        }],
        mode: 'payment',
    });

    console.log("RESPUESTA STRIPE SESSION", session.url)
    req.session.intentPay = session.url;
    req.session.payDg0 = req.session.analisis0 = req.session.analisis1 = req.session.analisis2 = req.session.analisis3 = false;
    req.session.empresarial0 = true;
    req.session.empresarial1 = false;
    req.session.empresarial2 = false;
    req.session.empresarial3 = false;
    res.redirect(303, session.url);
}

/************** PAGOS DIVIDOS - PLAN EMPRESARIAL ****************/
/** PAGO 1 - PORCENTAJE 60% */
pagosController.pagarEmpresarial_parte1 = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Plan empresarial')
    let precio = 0;
    if (pay) {
        precioE2 = precio;
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
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: precio,
                product_data: {
                    name: 'Pago primera cuota - Plan Empresarial',
                    images: ['https://3csigma.com/app_public_files/img/Plan-Empresarial-Stripe.png'],
                },
            },
            quantity: 1,
            description: `Establecer las Actividades a desarrollar, las pautas pertinentes para cada área vital y escalar tu negocio.`
        }],
        mode: 'payment',
    });

    console.log("RESPUESTA STRIPE SESSION", session.url)
    req.session.intentPay = session.url;
    req.session.payDg0 = req.session.analisis0 = req.session.analisis1 = req.session.analisis2 = req.session.analisis3 = false;
    req.session.empresarial0 = false;
    req.session.empresarial1 = true;
    req.session.empresarial2 = false;
    req.session.empresarial3 = false;
    res.redirect(303, session.url);
}

/** PAGO 2 - PORCENTAJE 20% */
pagosController.pagarEmpresarial_parte2 = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Plan empresarial')
    let precio = 0;
    if (pay) {
        precioE2 = precio;
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
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: precio,
                product_data: {
                    name: 'Pago segunda cuota - PLan Empresarial',
                    images: ['https://3csigma.com/app_public_files/img/Plan-Empresarial-Stripe.png'],
                },
            },
            quantity: 1,
            description: `Establecer las Actividades a desarrollar, las pautas pertinentes para cada área vital y escalar tu negocio.`
        }],
        mode: 'payment',
    });


    console.log("RESPUESTA STRIPE SESSION", session.url)
    req.session.intentPay = session.url;
    req.session.payDg0 = req.session.analisis0 = req.session.analisis1 = req.session.analisis2 = req.session.analisis3 = false;
    req.session.empresarial0 = false;
    req.session.empresarial1 = false;
    req.session.empresarial2 = true;
    req.session.empresarial3 = false;
    res.redirect(303, session.url);
}

/** PAGO 3 - PORCENTAJE 20% */
pagosController.pagarEmpresarial_parte3 = async (req, res) => {
    /** CONSULTANDO EMPRESA LOGUEADA */
    const empresas = await consultarDatos('empresas')
    const e = empresas.find(x => x.email == req.user.email)
    const id_empresa = e.id_empresas;
    const propuesta = await consultarDatos('propuestas')
    const pay = propuesta.find(i => i.empresa == id_empresa && i.tipo_propuesta == 'Plan empresarial')
    let precio = 0;
    if (pay) {
        precioE2 = precio;
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
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: precio,
                product_data: {
                    name: 'Pago tercera cuota - Plan Empresarial',
                    images: ['https://3csigma.com/app_public_files/img/Plan-Empresarial-Stripe.png'],
                },
            },
            quantity: 1,
            description: `Establecer las Actividades a desarrollar, las pautas pertinentes para cada área vital y escalar tu negocio.`
        }],
        mode: 'payment',
    });


    console.log("RESPUESTA STRIPE SESSION", session.url)
    req.session.intentPay = session.url;
    req.session.payDg0 = req.session.analisis0 = req.session.analisis1 = req.session.analisis2 = req.session.analisis3 = false;
    req.session.empresarial0 = false;
    req.session.empresarial1 = false;
    req.session.empresarial2 = false;
    req.session.empresarial3 = true;
    res.redirect(303, session.url);
}

/** PAGO ÚNICO - PLAN ESTRATÉGICO */
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

    console.log(price)

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
    req.session.payDg0 = req.session.analisis0 = req.session.analisis1 = req.session.analisis2 = req.session.analisis3 = req.session.empresarial0 = req.session.empresarial1 = req.session.empresarial2 = req.session.empresarial3 = false;
    req.session.planEstrategico = true;
    req.session.limiteSub = pay.limiteSub;
    console.log(req.session.limiteSub);
    res.redirect(303, session.url);
}

// CANCELAR SUBSCRIPCIÓN - PLAN ESTRATÉGICO
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
    let pagoEtapa1_ok = false, pagoOtras_etapas = false;
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
        // Pago exitoso para Diagnóstico de Negocio
        if (req.session.payDg0) {
            const actualizar = { diagnostico_negocio: JSON.stringify({ estado: 1, fecha, precio: precioDiag }) }
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, id_empresa])
            pagoEtapa1_ok = true;
        }

        // Pago exitoso para Análisis de Negocio
        let actualizarAnalisis = undefined;
        let pagoAnalisis = { estado: 1, fecha }
        if (req.session.analisis0) {
            pagoAnalisis.estado = 1;
            pagoAnalisis.precio = precioE2;
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
            pagoOtras_etapas = true;
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        }

        // Pago exitoso para Plan Empresarial
        let actualizarEmpresarial = undefined;
        let pagoEmpresarial = { estado: 1, fecha }
        if (req.session.empresarial0) {
            pagoEmpresarial.estado = 1;
            pagoEmpresarial.precio = precioE3;
            actualizarEmpresarial = {
                empresarial0: JSON.stringify(pagoEmpresarial),
                empresarial1: JSON.stringify({ estado: 0 })
            }
        } else if (req.session.empresarial1) {
            pagoEmpresarial.estado = 2;
            actualizarEmpresarial = { empresarial1: JSON.stringify(pagoEmpresarial) }
        } else if (req.session.empresarial2) {
            pagoEmpresarial.estado = 2;
            actualizarEmpresarial = { empresarial2: JSON.stringify(pagoEmpresarial) }
        } else if (req.session.empresarial3) {
            pagoEmpresarial.estado = 2;
            actualizarEmpresarial = { empresarial3: JSON.stringify(pagoEmpresarial) }
        } 

        if (actualizarEmpresarial != undefined) {
            pagoEtapa1_ok = false
            pagoOtras_etapas = true;
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarEmpresarial, id_empresa])
        }
        
        if (req.session.planEstrategico) {
            const idSession = req.session.idSesion;
            const dataSession = await stripe.checkout.sessions.retrieve(idSession);

            // ACTUALIZANDO SUBSCRIPCIÓN - CANCEL AT
            const limiteSub = req.session.limiteSub;
            let fCancel = new Date(fecha) // Fecha de Cancelación para la Sub
            fCancel.setMonth(fCancel.getMonth()+limiteSub)
            console.log("\n<<<< Fecha de Cancelación para la Sub >>>> ")
            console.log(fCancel)
            fCancel = (fCancel.getTime()/1000)-86400
            console.log(fCancel)
            console.log("----------------------------------------------------------------");
            const updateSub = await stripe.subscriptions.update(dataSession.subscription, {cancel_at: fCancel});
            console.log("\nUPDATE SUB >> ", updateSub);
            console.log("----------------------------------------------------------------");

            // Actualizando Pago de Plan Estrategico en DB
            const fechaCancelacion = new Date(fCancel*1000).toLocaleDateString('en-US')
            const actualizar = { estrategico: JSON.stringify({ estado: 1, fecha, subscription: dataSession.subscription, fechaCancelacion }) }
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, id_empresa])

            pagoEtapa1_ok = false;
            pagoOtras_etapas = true;
        }

    }

    res.render('empresa/dashboard', {
        pagoEtapa1_ok, pagoOtras_etapas,
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