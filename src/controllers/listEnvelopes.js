const docusign = require("docusign-esign");
const dsConfig = require('../config/index.js').config;
/**
 * Consult envelope status
 */
 const listEnvelope = async (args, envelopeId) => {
    
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
    results = await envelopesApi.listStatusChanges(dsConfig.settings.dsAccountID, options);
    // console.log("<<<< Results List Envelope >>>>\n", result);
    return results;
  }

  module.exports = { listEnvelope };