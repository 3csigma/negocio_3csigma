const pool = require('../database')
const express = require('express');
const router = express.Router();
const { estaLogueado, validarURLPagar } = require('../lib/auth')
const { my_domain, clientSecretStripe } = require('../keys').config
const stripe = require('stripe')(clientSecretStripe);
// const {consultarPagos} = require('../lib/helpers')

// const MY_DOMAIN = 'http://localhost:4000';

router.post('/create-checkout-session', estaLogueado, async (req, res) => {
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

router.get('/pago-exitoso', estaLogueado, validarURLPagar, async (req, res) => {
  let diagnosticoPagado = 0, analisisPagado = 0;
  console.log("\nSuccess - Intent Payment >>> ", req.session.intentPay)
  req.session.intentPay = undefined; // Borrando info del Intento de pago 
  /** Actualizar info de que el usuario ya pagó el diagnostico de negocio */
  const id_user = req.user.id;
  const actualizarEstado = {diagnostico_negocio: 1}
  await pool.query('UPDATE pagos SET ? WHERE id_user = ?', [actualizarEstado, id_user])
  /** Consultando que pagos ha realizado el usuario */
  const pagos = await pool.query('SELECT * FROM pagos WHERE id_user = ?', [id_user])
  if (pagos.length == 0) {
      const nuevoPago = { id_user }
      await pool.query('INSERT INTO pagos SET ?', [nuevoPago], (err, result) => {
          if (err) throw err;
          // console.log("Se ha registrado un usuario en la tabla Pagos - Estados 0");
      })
  } else {
      if (pagos[0].diagnostico_negocio == '1') {
          diagnosticoPagado = 1; // Pago Diagnóstico
          req.pagoDiag = true;
          pagoDiag = true;
      }
      if (pagos[0].analisis_negocio == '1') {
          analisisPagado = 1; // Pago Análisis
      }
  }
  res.render('dashboard', {
    alertSuccess: true, // Pago Exitoso
    pagoDiag,
    dashx: true, wizarx: false, login: false, diagnosticoPagado, analisisPagado, itemActivo: 1
  })
})

router.get('/pago-cancelado', estaLogueado, validarURLPagar, (req, res) => {
  const diagnosticoPagado = 0, analisisPagado = 0;
  console.log("\nCancel - Intent Payment >>> ", req.session.intentPay)
  console.log("DIAGNOSTICO PAGADO SI o NO >>> ", diagnosticoPagado)
  req.session.intentPay = undefined;
  res.render('dashboard', {
    alertCancel: true, // Pago Cancelado
    dashx: true, wizarx: false, login: false, pagoPendiente : true, diagnosticoPagado, analisisPagado, itemActivo: 1
  })
})

module.exports = router