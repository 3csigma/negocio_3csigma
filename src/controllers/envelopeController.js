const path = require('path');
const validator = require('validator');
// const dsConfig = require('../../../config/index.js').config;
const { sendEnvelope } = require('./signingViaEmail');

const signingViaEmail = exports;
const demoDocsPath = path.resolve(__dirname, '../public/documents');
const doc2File = 'World_Wide_Corp_lorem.pdf';
// const doc3File = 'World_Wide_Corp_lorem.pdf';

signingViaEmail.createController = async (req, res) => {
    // Step 1. Check the token
    // At this point we should have a good token. But we
    // double-check here to enable a better UX to the user.
    // const tokenOK = req.dsAuth.checkToken(minimumBufferMin);
    // if (! tokenOK) {
    //     req.flash('info', 'Sorry, you need to re-authenticate.');
    //     // Save the current operation so it will be resumed after authentication
    //     req.dsAuth.setEg(req, eg);
    //     res.redirect(mustAuthenticate);
    // }

    // Step 2. Call the worker method
    const { body } = req;
    const envelopeArgs = {
        signerEmail: validator.escape(body.signerEmail),
        signerName: validator.escape(body.signerName),
        status: "sent",
        doc2File: path.resolve(demoDocsPath, doc2File),
        //   doc3File: path.resolve(demoDocsPath, doc3File)
    };
    const args = {
        accessToken: "eyJ0eXAiOiJNVCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNjgxODVmZjEtNGU1MS00Y2U5LWFmMWMtNjg5ODEyMjAzMzE3In0.AQoAAAABAAUABwAAEMS0lhbaSAgAAHiIFp8W2kgCAFTEkOW5JiFKq0n_zC3u3PkVAAEAAAAYAAEAAAAFAAAADQAkAAAAZmI5YWQ3ZGEtYmNlNy00Yzg2LWJlMTEtZjliYTBhNmVlZTU0IgAkAAAAZmI5YWQ3ZGEtYmNlNy00Yzg2LWJlMTEtZjliYTBhNmVlZTU0EgABAAAABgAAAGp3dF9iciMAJAAAAGZiOWFkN2RhLWJjZTctNGM4Ni1iZTExLWY5YmEwYTZlZWU1NA.Ps3vSGzGePnm9mwDfeU64tb3pKvu9MHavOkPvngKhIwSXx6o7CUI4iB_timoO0YJcPOnP0lNZOfHs-hIwwUnCIYSb6TxuB8OVUDlbIAFzh--qHJh1UN15SM2tflGbrzJe2P9CxTq904Cuz0esMkGH7KfefqiLq73hkT_lXfhe6K0y82cvgufgeKawJlUJ2dhEXFLj8s4QMBjFfQ-XLsiUg7izfcALSRLh1wkdxUhb-KX8Cx875HDe3xHTnF8YouoQBk6AwpugtVMqaXA_0Xkr5rf1ic52iq6UxUlmznmTqwE2cA4OUMSIYRlFKRpEGNg9k4HYZT2sCympJU_xhS6eQ",
        basePath: "https://demo.docusign.net/restapi",
        accountId: "37f4eff2-c8db-4ca2-9c47-1eacbae43960",
        envelopeArgs: envelopeArgs
    };
    let results = null;

    try {
        results = await sendEnvelope(args);
    }
    catch (error) {
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
        req.session.envelopeId = results.envelopeId; // Save for use by other examples
        // which need an envelopeId
        res.json({
            title: "Sobre Enviado",
            h1: "Sobre Enviado",
            message: `¡El sobre ha sido creado y enviado!<br/>ID del sobre: ${results.envelopeId}.`
        });
    }
}