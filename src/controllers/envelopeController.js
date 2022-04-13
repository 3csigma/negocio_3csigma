const path = require('path');
const validator = require('validator');
const dsConfig = require('../config/index.js').config;
const { sendEnvelope } = require('./signingViaEmail');
const { listEnvelope } = require('./listEnvelopes');
const helpers = require('../lib/helpers.js');

const signingViaEmail = exports;
const rutaDocs = path.resolve(__dirname, '../public/documents');
const doc2File = 'World_Wide_Corp_lorem.pdf';

signingViaEmail.createController = (req, res) => {
    // Step 1. Check the token
    const { body } = req;
    helpers.authToken().then(async (values) => {
        const envelopeArgs = {
            signerEmail: validator.escape(body.signerEmail),
            signerName: validator.escape(body.signerName),
            status: "sent",
            doc2File: path.resolve(rutaDocs, doc2File),
        };

        // dsConfig.args = {
        //     accessToken: values.access_token,
        //     basePath: `https://${dsConfig.settings.basePath}/restapi`,
        //     accountId: dsConfig.settings.dsAccountID,
        //     envelopeArgs: envelopeArgs
        // }
        const args = {
            accessToken: values.access_token,
            basePath: `https://${dsConfig.settings.basePath}/restapi`,
            accountId: dsConfig.settings.dsAccountID,
            envelopeArgs: envelopeArgs
        };
        // console.log("args DATA >>> ", args)

        let results = null;

        try {
            results = await sendEnvelope(args);
        } catch (error) {
            const errorBody = error && error.response && error.response.body;
            // we can pull the DocuSign error code and message from the response body
            const errorCode = errorBody && errorBody.errorCode;
            const errorMessage = errorBody && errorBody.message;
            // In production, may want to provide customized error messages and
            // remediation advice to the user.
            // res.render('pages/error', {err: error, errorCode, errorMessage});
            res.json({ err: error, errorCode, errorMessage });
        }
        if (results) {
            req.session.envelopeId = results.envelopeId; // Guardando el ID del Sobre
            console.log("\n***** ¡El sobre se ha enviado satisfactoriamente! ******")
            /**
             * Actualizando estado del acuerdo en la Base de datos
             */
            await listEnvelope(args, results.envelopeId, body.signerEmail).then((values) => {
                console.log("Value Email ==> ", values.email)
                console.log("Value Result ==> ", values.result.envelopes[0].status)
                req.session.email_user = values.email;
                res.redirect('/acuerdo-de-confidencialidad')
            })
        }
    })
}