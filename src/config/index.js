const settings = require('./appsettings.json');

const dsOauthServer = settings.production ? 'account.docusign.com' : 'account-d.docusign.com';

settings.gatewayAccountId = process.env.DS_PAYMENT_GATEWAY_ID || settings.gatewayAccountId;
settings.dsClientSecret = process.env.DS_CLIENT_SECRET || settings.dsClientSecret;
settings.signerEmail = process.env.DS_SIGNER_EMAIL || settings.signerEmail;
settings.signerName = process.env.DS_SIGNER_NAME || settings.signerName;
settings.dsClientId = process.env.DS_CLIENT_ID || settings.dsClientId;
settings.appUrl = process.env.DS_APP_URL || settings.appUrl;
settings.dsJWTClientId = process.env.DS_JWT_CLIENT_ID || settings.dsJWTClientId;
settings.privateKeyLocation = process.env.DS_PRIVATE_KEY_PATH  || settings.privateKeyLocation;
settings.impersonatedUserGuid =  process.env.DS_IMPERSONATED_USER_GUID || settings.impersonatedUserGuid;

let fechaActual = Math.floor(Date.now()/1000)
let fechaExp = Math.floor(Date.now()/1000)+(60*60);
const privateKeyRSA = settings.privateKeyLocation
let authToken, args = {};
let acuerdoFirmado = {};

const dsPayload = {
  "iss": settings.dsIntegrationKey,
  "sub": settings.impersonatedUserGuid,
  "aud" : dsOauthServer,
  "iat": fechaActual,
  "exp" : fechaExp,
  "scope" : "signature"
}

exports.config = {
  dsOauthServer, dsPayload,
  privateKeyRSA, authToken,
  settings, args, acuerdoFirmado
};