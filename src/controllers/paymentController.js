const pool = require('../database')
const paymentController = exports;
// const {clavesStripe} = require('../config/index.js').config;
const stripe = require("stripe")('sk_test_51KoWlrGzbo0cXNUH7JnVHxXqKjN9UaAmSVRrf89EGuk3hQM8BztHtlLYLiPIZsH7u7eLHkyYdM7gYwJpXOfQLi9f00f5mJxKsw');

const calculateOrderAmount = (items) => {
    // Replace this constant with a calculation of the order's amount
    // Calculate the order total on the server to prevent
    // people from directly manipulating the amount on the client
    return 5999;
};

const chargeCustomer = async (customerId) => {
    // Lookup the payment methods available for the customer
    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
    });
    try {
        // Charge the customer and payment method immediately
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 5999,
            currency: "usd",
            customer: customerId,
            payment_method: paymentMethods.data[0].id,
            off_session: true,
            confirm: true,
        });
    } catch (err) {
        // Error code will be authentication_required if authentication is needed
        console.log("El código de error es: ", err.code);
        const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
        console.log("PI retrieved: ", paymentIntentRetrieved.id);
    }
};

paymentController.createPayment = async (req, res) => {
    const { items } = req.body;
    // Alternatively, set up a webhook to listen for the payment_intent.succeeded event
    // and attach the PaymentMethod to a new Customer
    const customer = await stripe.customers.create();

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        customer: customer.id,
        setup_future_usage: "off_session",
        amount: calculateOrderAmount(items),
        currency: "usd",
        automatic_payment_methods: {
            enabled: true,
        },
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
}

