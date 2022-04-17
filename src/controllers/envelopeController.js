const path = require('path');
const validator = require('validator');
const dsConfig = require('../config/index.js').config;
const { sendEnvelope } = require('./signingViaEmail');
const { listEnvelope } = require('./listEnvelopes');
const helpers = require('../lib/helpers.js');
const pool = require('../database')
const signingViaEmail = exports;

const rutaDocs = path.resolve(__dirname, '../public/documents');
const doc2File = 'World_Wide_Corp_lorem.pdf';

signingViaEmail.createController = (req, res) => {
    const { body } = req;
    helpers.authToken().then(async (values) => {
        const envelopeArgs = {
            signerEmail: validator.escape(body.signerEmail),
            signerName: validator.escape(body.signerName),
            status: "sent",
            doc2File: path.resolve(rutaDocs, doc2File),
        };

        const args = {
            accessToken: values.access_token,
            basePath: `https://${dsConfig.settings.basePath}/restapi`,
            accountId: dsConfig.settings.dsAccountID,
            envelopeArgs: envelopeArgs
        };

        dsConfig.args = args;
        // console.log("dsConfig.args >>> ", dsConfig.args)
        console.log("Cargando...\n")

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
            dsConfig.envelopeId = results.envelopeId;
            req.session.email_user = args.envelopeArgs.signerEmail;
            console.log("Value Email ==> ", args.envelopeArgs.signerEmail )
            console.log("\n***** ¡El sobre se ha enviado satisfactoriamente! ******")
            /**
             * Actualizando estado del acuerdo en la Base de datos
             */
            await listEnvelope(dsConfig.args, results.envelopeId).then(async (values) => {
                const statusSign = values.envelopes[0].status;
                const email = args.envelopeArgs.signerEmail
                console.log("Result STATUS SIGN ==> ", statusSign)               
                const id_user = req.user.id;
                let estado = {}, noPago = true, acuerdoFirmado = false;

                estado.valor = 1; // Documento enviado
                estado.form = true; // Debe mostrar el formulario
                estado.enviado = true;
                
                if (req.session.email_user) {
                    const newDatos = {
                        email_signer: req.session.email_user,
                        envelopeId: req.session.envelopeId,
                        estado: estado.valor,
                        args: JSON.stringify(args)
                    }
                    await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_user = ?', [newDatos, id_user])
                    console.log("<<< TABLA ACUERDO >>>", estado)
                    console.log("Email Signer => ", email)
                    console.log("** ACUERDO FIRMADO => ", acuerdoFirmado)
                    console.log("** NO HA PAGADO => ", noPago)
                    res.render('empresa/acuerdoConfidencial', { dashx: true, wizarx: false, tipoUser: 'User', noPago, itemActivo: 2, email, estado })
                }
            }) 
        }
    })
}