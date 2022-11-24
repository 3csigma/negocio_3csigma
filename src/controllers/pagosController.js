const pagosController = exports;
const pool = require('../database')
const { my_domain, clientSecretStripe } = require('../keys').config
const { consultarDatos } = require('../lib/helpers')
const stripe = require('stripe')(clientSecretStripe);

/** PAGO ÚNICO - DIAGNÓSTICO DE NEGOCIO */
pagosController.pagarDiagnostico = async (req, res) => {
    console.log("URL Sesión>>> ", req.intentPay);
    const session = await stripe.checkout.sessions.create({
        success_url: `${my_domain}/pago-exitoso`,
        cancel_url: `${my_domain}/pago-cancelado`,
        line_items: [
            { price: 'price_1Kqg8yGzbo0cXNUHYMXPROWT', quantity: 1 },
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
        precio = parseFloat(precio) - (parseFloat(precio*0.1))
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
                        name: 'Pago Único - Análisis de negocio',
                        images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                    },
                    unit_amount: precio,
                },
                quantity: 1,
                description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nihil nobis nesciunt fugiat autem hic. Nemo ut fugit repudiandae enim assumenda vitae culpa quibusdam quae cum unde? Assumenda rem asperiores ducimus?'
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
                        name: 'Pago 1 - Análisis de negocio',
                        images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                    },
                    unit_amount: precio,
                },
                quantity: 1,
                description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nihil nobis nesciunt fugiat autem hic. Nemo ut fugit repudiandae enim assumenda vitae culpa quibusdam quae cum unde? Assumenda rem asperiores ducimus?'
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
                        name: 'Pago 2 - Análisis de negocio',
                        images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                    },
                    unit_amount: precio,
                },
                quantity: 1,
                description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nihil nobis nesciunt fugiat autem hic. Nemo ut fugit repudiandae enim assumenda vitae culpa quibusdam quae cum unde? Assumenda rem asperiores ducimus?'
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
                        name: 'Pago 3 - Análisis de negocio',
                        images: ['https://3csigma.com/app_public_files/img/Analisis-de-negocio.png'],
                    },
                    unit_amount: precio,
                },
                quantity: 1,
                description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nihil nobis nesciunt fugiat autem hic. Nemo ut fugit repudiandae enim assumenda vitae culpa quibusdam quae cum unde? Assumenda rem asperiores ducimus?'
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

    // const precio = 456000

    // const product = await stripe.products.create({
    //     name: 'Plan estratégico de negocio',
    //     description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nihil nobis nesciunt fugiat autem hic. Nemo ut fugit repudiandae enim assumenda vitae culpa quibusdam quae cum unde? Assumenda rem asperiores ducimus?',
    //     images: ['https://3csigma.com//app_public_files/img/Plan-estrategico-de-negocio_checkout.png'],
    //     default_price_data: {
    //         unit_amount: precio,
    //         currency: 'usd',
    //         recurring: {interval: 'month'},
    //     },
    //     expand: ['default_price'],
    // });

    const price = await stripe.prices.create({
        unit_amount: precio,
        currency: 'usd',
        recurring: {interval: 'month'},
        product: 'prod_MoQcrJC6jsrtcY',
    });

    // const product = await stripe.products.update(
    //     'prod_MoQcrJC6jsrtcY',
    //     {default_price: price.id}
    // );

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

    // console.log(JSON.stringify(subscriptions))
    // res.send(JSON.stringify(subscriptions))

    req.session.intentPay = session.url;
    req.session.payDg0 = req.session.analisis0 = req.session.analisis1 = req.session.analisis2 = req.session.analisis3 = false;
    req.session.planEstrategico = true;
    res.redirect(303, session.url);
}

pagosController.cancelarSub = async (req, res) => {
    const { empresa, id_sub } = req.body;
    const deleted = await stripe.subscriptions.del(id_sub);
    // const subscription = await stripe.subscriptions.retrieve(id_sub);
    console.log("\n>>> DELETED: ", deleted)
    let result = false;
    if (deleted.status == 'canceled') {
        const fecha = new Date().toLocaleDateString("en-US")
        const actualizar = { estrategico: JSON.stringify({ estado: 2, fecha, subscription: id_sub }) }
        await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, empresa])
        result = true;
    }
    res.send(result)
}

/********************************************************************/
pagosController.pagoExitoso = async (req, res) => {
    let destino = 'empresa/dashboard', itemActivo = 1, alertSuccess = false, pagoExitoso = false, pagoEtapa3Ok = false;
    // Borrando info del Intento de pago
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
            const actualizar = { diagnostico_negocio: JSON.stringify({ estado: 1, fecha }) }
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, id_empresa])
            alertSuccess = true
            pagoExitoso = false;
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
        
        if (req.session.planEstrategico) {
            const idSession = req.session.idSesion;
            const dataSession = await stripe.checkout.sessions.retrieve(idSession);
            const actualizar = { estrategico: JSON.stringify({ estado: 1, fecha, subscription: dataSession.subscription }) }
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, id_empresa])
            alertSuccess = false;
            pagoExitoso = false;
            pagoEtapa3Ok = true;
            itemActivo = 6;
        }

        if (actualizarAnalisis != undefined) {
            alertSuccess = false
            pagoExitoso = true;
            itemActivo = 4
            await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
        }

    }

    res.render(destino, {
        alertSuccess, pagoExitoso, pagoEtapa3Ok,
        user_dash: true, wizarx: false, login: false,
        itemActivo,
    })
}

pagosController.pagoCancelado = async (req, res) => {
    let destino = 'empresa/dashboard', itemActivo = 1, alertCancel = true, pagoCancelado = false, pagoEtapa3Cancel = false;
    req.session.intentPay = undefined;
    if (req.session.analisis0 || req.session.analisis1 || req.session.analisis2 || req.session.analisis3) {
        pagoCancelado = true;
        alertCancel = false;
        itemActivo = 4;
    }

    if (req.session.planEstrategico) {
        pagoEtapa3Cancel = true; 
        pagoCancelado = false; 
        alertCancel = false;
        itemActivo = 6;
    }

    req.session.payDg0 = false;
    req.session.analisis0 = false;
    req.session.analisis1 = false;
    req.session.analisis2 = false;
    req.session.analisis3 = false;

    res.render(destino, {
        alertCancel, pagoCancelado, pagoEtapa3Cancel,
        user_dash: true, wizarx: false, login: false,
        itemActivo,
    })
}