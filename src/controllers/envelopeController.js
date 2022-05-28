const validator = require('validator');
const dsConfig = require('../config/index.js').config;
const { sendEnvelope } = require('./signingViaEmail');
const { listEnvelope } = require('./listEnvelopes');
const helpers = require('../lib/helpers.js');
const pool = require('../database')
const signingViaEmail = exports;

signingViaEmail.createController = (req, res) => {
    const { body } = req;

    helpers.authToken().then(async (values) => {

        const envelopeArgs = {
            signerEmail: validator.escape(body.signerEmail),
            signerName: validator.escape(body.signerName),
            status: "sent",
            templateId: '05605966-f97f-44aa-a640-5d9b428bd9a3'
        };

        const args = {
            accessToken: values.access_token,
            basePath: `https://${dsConfig.settings.basePath}/restapi`,
            accountId: dsConfig.settings.dsAccountID,
            envelopeArgs: envelopeArgs
        };

        dsConfig.args = args;
        console.log("\n<<<< ARGUMENTOS PARA DOCUSIGN >>> ", dsConfig.args)
        console.log("\nCargando......\n")

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
                const row = await pool.query('SELECT * FROM empresas WHERE email = ? LIMIT 1', [req.user.email])
                const id_empresa = row[0].id_empresas;
                let estado = {}

                estado.valor = 1; // Documento enviado
                estado.form = true; // Debe mostrar el formulario
                estado.enviado = true;

                // Fecha Expiración del Temporizador - Acuerdo de Confidencialidad
                const fechaExp = new Date()
                fechaExp.setMinutes(fechaExp.getMinutes()+59)

                if (req.session.email_user) {
                    const datos = {
                        email_signer: req.session.email_user,
                        envelopeId: req.session.envelopeId,
                        estadoAcuerdo: estado.valor,
                        args: JSON.stringify(args),
                    }

                   await pool.query('UPDATE acuerdo_confidencial SET ? WHERE id_empresa = ?', [datos, id_empresa])
                   res.render('empresa/acuerdoConfidencial', { user_dash: true, wizarx: false, pagoDiag: true, itemActivo: 2, email, estado })
                } else {
                    res.redirect('/acuerdo-de-confidencialidad')
                }

            }) 
        }

    })
}