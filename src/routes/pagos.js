const pool = require('../database')
const express = require('express');
const router = express.Router();
const { checkLogin, validarURLPagar } = require('../lib/auth')
const { my_domain, clientSecretStripe } = require('../keys').config
const stripe = require('stripe')(clientSecretStripe);
// const {consultarPagos} = require('../lib/helpers')

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

  /** Función para consultar estado del pago Stripe */
  // stripe.retrievePaymentIntent.then(function(response) {
  //   if (response.paymentIntent && response.paymentIntent.status === 'succeeded') {
  //     // Handle successful payment here
  //   } else {
  //     // Handle unsuccessful, processing, or canceled payments and API errors here
  //   }
  // });

  res.redirect(303, session.url);
});

router.post('/checkout-etapa2', checkLogin, async (req, res) => {
  const empresa = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
  const id_empresa = empresa[0].id_empresas;
  const propuesta = await pool.query('SELECT * FROM propuesta_analisis')
  const pay = propuesta.find(i => i.empresa == id_empresa)
  let precio = 500;
  if (pay) {
    precio = pay.precio + '00'
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
  req.session.etapa2 = true;
  res.redirect(303, session.url);
});

router.get('/pago-exitoso', checkLogin, validarURLPagar, async (req, res) => {
  let diagnosticoPagado = 0, analisisPagado = 0, destino = 'pages/dashboard', itemActivo = 1, btnPagar = {}, propuesta = {};
  // Borrando info del Intento de pago
  req.session.intentPay = undefined; 
  req.session.etapa2 = undefined;
  btnPagar.etapa1 = true;
  btnPagar.activar1 = true;
  
  /** Actualizar info de que el usuario ya pagó el diagnostico de negocio */
  const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
  const id_empresa = row[0].id_empresas;

  /** Consultando que pagos ha realizado el usuario */
  const pagos = await pool.query('SELECT * FROM pagos WHERE id_empresa = ?', [id_empresa])

  if (pagos.length > 0) {
    diagnostico_negocio = 1
    const actualizarPago1 = {diagnostico_negocio}
    const pagoEtapa1 = await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarPago1, id_empresa])
    if (pagoEtapa1.affectedRows > 0) {
      diagnosticoPagado = 1
      req.pagoDiag = true;
      btnPagar.etapa1 = true;
      btnPagar.activar1 = false;
      btnPagar.etapa2 = false;
      btnPagar.activar2 = false;
    }

    const pago = pagos[0]
    if (pago.analisis_negocio == 0) {
      analisis_negocio = 1
      const actualizarPago2 = {analisis_negocio}
      const pagoEtapa2 = await pool.query('UPDATE pagos SET ? WHERE id_empresa = ?', [actualizarPago2, id_empresa])
      if (pagoEtapa2.affectedRows > 0) {
        analisisPagado = 1
        destino = 'empresa/analisis';
        itemActivo = 4;
        btnPagar.etapa1 = false;
        btnPagar.activar1 = false;
        btnPagar.etapa2 = true;
        btnPagar.activar2 = false;
        propuesta.pago = true
        acuerdoFirmado = true
      }
    }
  }

  res.render(destino, {
    alertSuccess: true, // Pago Exitoso
    user_dash: true, wizarx: false, login: false,
    btnPagar, diagnosticoPagado, analisisPagado, itemActivo,
    propuesta, acuerdoFirmado
  })
})

router.get('/pago-cancelado', checkLogin, validarURLPagar, async (req, res) => {
  let diagnosticoPagado = 0, analisisPagado = 0, pagoPendiente = true, destino = 'pages/dashboard', itemActivo = 1, btnPagar = {};
  const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
  const id_empresa = row[0].id_empresas;
  const pagos = await pool.query('SELECT * FROM pagos WHERE id_empresa = ?', [id_empresa])
  const propuestas = await pool.query('SELECT * FROM propuesta_analisis')
  const propuesta = propuestas.find(i => i.empresa == id_empresa)
  btnPagar.etapa1 = true;
  btnPagar.activar1 = true;
  btnPagar.etapa2 = false;
  btnPagar.activar2 = false;
  if (pagos.length > 0) {
    const pago = pagos[0]
    diagnosticoPagado = pago.diagnostico_negocio
    analisisPagado = pago.analisis_negocio
    if (diagnosticoPagado == 1 && analisisPagado == 0 && !propuesta) {
      pagoPendiente = false
      btnPagar.etapa1 = true;
      btnPagar.activar1 = false;
      btnPagar.etapa2 = false;
      btnPagar.activar2 = false;
    } 
    if (diagnosticoPagado == 1 && analisisPagado == 0 && propuesta) {
      pagoPendiente = false
      btnPagar.etapa1 = false;
      btnPagar.activar1 = false;
      btnPagar.etapa2 = true;
      btnPagar.activar2 = true;
      acuerdoFirmado = true
    }
  }
  req.session.intentPay = undefined;
  let propueta
  if (req.session.etapa2) {
    destino = 'empresa/analisis';
    itemActivo = 4;
  }
  res.render(destino, {
    alertCancel: true, // Pago Cancelado
    user_dash: true, wizarx: false, login: false, pagoPendiente, diagnosticoPagado, analisisPagado, btnPagar, itemActivo,
    propuesta, acuerdoFirmado
  })
})

module.exports = router