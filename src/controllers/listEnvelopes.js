const docusign = require("docusign-esign");
const moment = require('moment') 
/**
 * Consult envelope status
 */
 const listEnvelope = async (args, envelopeId, email) => {
    
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient)
      , results = null;

    // List the envelopes
    // The Envelopes::listStatusChanges method has many options
    // See https://developers.docusign.com/esign-rest-api/reference/Envelopes/Envelopes/listStatusChanges

    // Filtrado de la consulta
    // let options = {fromDate: moment().subtract(5, 'days').format()};
    let options = {envelopeIds: envelopeId};

    // Exceptions will be caught by the calling function
    result = await envelopesApi.listStatusChanges(args.accountId, options);
    // console.log("<<<< Results List Envelope >>>>\n", result);
    resultados = {result, email}
    return resultados;
  }

  module.exports = { listEnvelope };