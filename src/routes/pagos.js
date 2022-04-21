// This is your test secret API key.
const express = require('express');
const router = express.Router();
const { estaLogueado } = require('../lib/auth')
const { validatePay } = require('../lib/helpers')
const {my_domain, clientSecretStripe} = require('../keys').config
const stripe = require('stripe')(clientSecretStripe);

// const MY_DOMAIN = 'http://localhost:4000';

router.post('/create-checkout-session', estaLogueado, async (req, res) => {
  
  const session = await stripe.checkout.sessions.create({
    success_url: `${my_domain}/pay-success`,
    cancel_url: `${my_domain}/pay-cancel`,
    line_items: [
      { price: 'price_1Kqg8yGzbo0cXNUHYMXPROWT', quantity: 1 },
    ],
    mode: 'payment',
  });

  req.intentPay = session.url;

  // stripe.retrievePaymentIntent.then(function(response) {
  //   if (response.paymentIntent && response.paymentIntent.status === 'succeeded') {
  //     // Handle successful payment here
  //   } else {
  //     // Handle unsuccessful, processing, or canceled payments and API errors here
  //   }
  // });

  res.redirect(303, session.url);
});

router.get('/pay-success', estaLogueado, validatePay, (req, res) => {
  res.render('dashboard', { dashx: true, wizarx: false, login: false, stripe: true })
})

router.get('/pay-cancel', estaLogueado, validatePay, (req, res) => {

  res.render('dashboard', { dashx: true, wizarx: false, login: false, stripe: true })
})

module.exports = router