const pool = require('../database')
const express = require('express');
const router = express.Router();
const { checkLogin, validarURLPagar } = require('../lib/auth')
const { my_domain, clientSecretStripe } = require('../keys').config
const stripe = require('stripe')(clientSecretStripe);

// const MY_DOMAIN = 'http://localhost:4000';
router.post('/create-checkout-session', checkLogin, async (req, res) => {
  req.session.etapa2 = false;
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

  res.redirect(303, session.url);
});

/** PAGO A STRIPE - ANÁLISIS DE NEGOCIO */
router.post('/checkout-etapa2', checkLogin, async (req, res) => {
  req.session.payDiag = false;
  const empresa = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
  const id_empresa = empresa[0].id_empresas;
  const propuesta = await pool.query('SELECT * FROM propuesta_analisis')
  const pay = propuesta.find(i => i.empresa == id_empresa)
  let precio = 0;
  if (pay) {
    precio = pay.precio_total + '00'
    precio = parseFloat(precio)
  }

  const session = await stripe.checkout.sessions.create({
    success_url: `${my_domain}/pago-exitoso`,
    cancel_url: `${my_domain}/pago-cancelado`,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Análisis de negocio',
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
  req.session.analisis0 = true;
  res.redirect(303, session.url);
});

/** PAGO 1 ANÁLISIS PORCENTAJE 60% */
router.post('/pagar-analisis-per1', checkLogin, async (req, res) => {
  req.session.payDiag = false;
  const empresa = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
  const id_empresa = empresa[0].id_empresas;
  const propuesta = await pool.query('SELECT * FROM propuesta_analisis')
  const pay = propuesta.find(i => i.empresa == id_empresa)
  let precio = 0;
  if (pay) {
    precio = pay.precio_per1 + '00'
    precio = parseFloat(precio)
  }

  const session = await stripe.checkout.sessions.create({
    success_url: `${my_domain}/pago-exitoso`,
    cancel_url: `${my_domain}/pago-cancelado`,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Análisis de negocio',
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
  req.session.analisis0 = false;
  req.session.analisis1 = true;
  res.redirect(303, session.url);
});

/** PAGO 2 ANÁLISIS PORCENTAJE 20% */
router.post('/pagar-analisis-per2', checkLogin, async (req, res) => {
  req.session.payDiag = false;
  const empresa = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
  const id_empresa = empresa[0].id_empresas;
  const propuesta = await pool.query('SELECT * FROM propuesta_analisis')
  const pay = propuesta.find(i => i.empresa == id_empresa)
  let precio = 0;
  if (pay) {
    precio = pay.precio_per2 + '00'
    precio = parseFloat(precio)
  }

  const session = await stripe.checkout.sessions.create({
    success_url: `${my_domain}/pago-exitoso`,
    cancel_url: `${my_domain}/pago-cancelado`,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Análisis de negocio',
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
  req.session.analisis0 = false;
  req.session.analisis2 = true;
  res.redirect(303, session.url);
});

/** PAGO 3 ANÁLISIS PORCENTAJE 20% */
router.post('/pagar-analisis-per3', checkLogin, async (req, res) => {
  req.session.payDiag = false;
  const empresa = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
  const id_empresa = empresa[0].id_empresas;
  const propuesta = await pool.query('SELECT * FROM propuesta_analisis')
  const pay = propuesta.find(i => i.empresa == id_empresa)
  let precio = 0;
  if (pay) {
    precio = pay.precio_per3 + '00'
    precio = parseFloat(precio)
  }

  const session = await stripe.checkout.sessions.create({
    success_url: `${my_domain}/pago-exitoso`,
    cancel_url: `${my_domain}/pago-cancelado`,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Análisis de negocio',
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
  req.session.analisis0 = false;
  req.session.analisis3 = true;
  res.redirect(303, session.url);
});

router.get('/pago-exitoso', checkLogin, validarURLPagar, async (req, res) => {
  let destino = 'pages/dashboard', itemActivo = 1
  // Borrando info del Intento de pago
  req.session.intentPay = undefined; 
  req.session.etapa2 = undefined;

  if (req.session.analisis0 || req.session.analisis1 || req.session.analisis2 || req.session.analisis3) {
    destino = 'empresa/analisis'
    itemActivo = 4
  }
  
  /** Actualizar info de que el usuario ya pagó el diagnostico de negocio */
  const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
  const id_empresa = row[0].id_empresas;

  /** Consultando que pagos ha realizado la empresa */
  const pagos = await pool.query('SELECT * FROM pagos WHERE id_empresa = ?', [id_empresa])

  if (pagos.length > 0) {
    const fecha =  new Date().toLocaleDateString("en-US")

    if (req.session.payDiag) {
      const actualizar = {diagnostico_negocio: JSON.stringify({estado: 1, fecha})}
      await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizar, id_empresa])
    }
    
    let pagoAnalisis = {estado: 1, fecha}
    let actualizarAnalisis = {}
    if (req.session.analisis0) { 
      pagoAnalisis.estado = 2; 
      actualizarAnalisis = {analisis_negocio: JSON.stringify(pagoAnalisis)}
    } else if (req.session.analisis1) {
      pagoAnalisis.estado = 2;
      actualizarAnalisis = {analisis_negocio1: JSON.stringify(pagoAnalisis)}
    } else if (req.session.analisis2) {
      pagoAnalisis.estado = 2;
      actualizarAnalisis = {analisis_negocio2: JSON.stringify(pagoAnalisis)}
    } else if (req.session.analisis3) {
      pagoAnalisis.estado = 2;
      actualizarAnalisis = {analisis_negocio3: JSON.stringify(pagoAnalisis)}
    }

    await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarAnalisis, id_empresa])
  }

  res.render(destino, {
    alertSuccess: true,
    user_dash: true, wizarx: false, login: false,
    itemActivo,
  })
})

router.get('/pago-cancelado', checkLogin, validarURLPagar, async (req, res) => {
  let destino = 'pages/dashboard', itemActivo = 1;
  req.session.intentPay = undefined;
  if (req.session.analisis0 || req.session.analisis1 || req.session.analisis2 || req.session.analisis3) {
    destino = 'empresa/analisis';
    itemActivo = 4;
  }

  res.render(destino, {
    alertCancel: true,
    user_dash: true, wizarx: false, login: false, 
    itemActivo
  })
})

module.exports = router