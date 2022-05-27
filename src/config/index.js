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

// let fechaActual = Math.floor(Date.now()/1000) // Fecha Actual
// let fechaExp = Math.floor(Date.now()/1000)+(60*15); // Expiración de 15 min (1440 min = 1 día)
let authToken, args = {}, envelopeId;
let acuerdoFirmado = {};

const clavesStripe = {
  publica: 'pk_test_51KoWlrGzbo0cXNUHA7kdUqpjjt4fEX8PP4usXF7s3YUC65UriJ2RHJsfB4fO4aqBIjZlu4lYD2lOfiEiGVyBilbt00qRzO8fn7',
  secreta: 'sk_test_51KoWlrGzbo0cXNUH7JnVHxXqKjN9UaAmSVRrf89EGuk3hQM8BztHtlLYLiPIZsH7u7eLHkyYdM7gYwJpXOfQLi9f00f5mJxKsw'
};

let dsPayload = {
  "iss": settings.dsIntegrationKey,
  "sub": settings.impersonatedUserGuid,
  "aud" : dsOauthServer,
  "iat": 0,
  "exp" : 1,
  "scope" : "signature"
}

const clavePrivada = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAigXm2qUq1AmSHjR2gYK/9p+im8+veSwxddgbO+fTKA5gtU85
olHr68WJsEmQwkVVahcs697h1LL+4WvDPNnTZKKk4eEk2ohAbls+BjO6vbL8gBSR
tMh7chidqf4dQbN/Mvqz0Gh8fdGNIJau/v3FRGI+brVxamiGENpvdetYb8X3F0+C
CsyJiTvQYdkjhZWigaKYY/RXrZYkjQqoZm92sl5xiXAy5+8pmTPsc2IVc2EmbYPC
FPJY4DrH3EDAmnkGc2ekoaM5wHT0HbsYCaj7sFNY1MM8dfcP2x8ulGvMDNb5UmyA
7X+aGyjKfmluK005UD8fcI9YCaseK5jgMXSDJQIDAQABAoIBAAR64CG/ZkUfNh67
S1ki9IjdjXgh8q/HQqgDNFnzpOFyLXQgjbBIBt5p5vEj+iWHj+EcmeRQDxF3jiuk
hU241SSnAfhbPtGhWGacmSGS1UTOmEDTKhfbU3cCQIj9OKCZYiHIjGks/DBTSrZT
AleJfZSdlAVXw1hxNDup82jwE0q2ASK9dlK6a8F2cHb0Aio+3qsy16rCOp1Un8+Q
rtSjqIn+KdaZtVLY2FYMqAR2jZL3UnxkmAgIkDRoyhFvwIqC3kOMFuqYNt+A4sXQ
faM1M3D7g4a4jg6BDjt9bF4SUGU7vaPwr+Q19GseUcrB07EGiF6pXSdlNOqjUn7E
jgPcdxECgYEAvPMAscJTYRCSdsaZKj7SQdrV2SzVgpGXbONagNUclpYYfzKFqok/
5ZlaZEQ39OpUgO+rIrxhDYt+VMEl/N9765nT/xlKtpceBYmoj0mxmytPGQN1b9De
CbkFk9F/S9edf4qSxOTLZuTMYOdW2d3LAX9apwWhFSJv1MwgImf34OkCgYEAuwCJ
T5pC7WVW/+tTXpXIZj1IELp4+BRkof6/Qwcbzf0oJatbxPuYLib64qTGvBRGhWTJ
n28NV2uen7oM9A9wXv4egOiHX53Cc/LHNDErn47zUpJhH9bdOhdPdX990lRGPSgP
vPmEFK/78NcdxNzUelxV+DFuW2dRozm++vVUSt0CgYAsl8EjMrSQ5ONcKtS9FqRy
rF3p6l3dedTd+u5CF4mutG/FnTvUmp285ythHISERcV5xJaEFSdmlfRTtl3rxyas
3Noei26JlzKbpfhlEMRc1aTOR3Ww1P+CFeuODlRXpuRh1Gd9Fm42s2rUt+RUeLbP
fKn9XyO8JCt2clJnLFhg+QKBgC661pVOzjS2o0P2kXHMajSqUazkfEA6EF+u4iqk
xxz1iyfGp3sVCBVYZk9mr8bmJi1FX2D5BlN3MD9n5b7DcOg8BnFeKh4JtUL2QzNW
qjkIJuPWcnDbZ5MRqiiJgG6j4p17ulsV2xy0UXgAuY6tRGeDVXRdHd+3dN4eGwxp
a/P9AoGBAJGHvzEVku3y4SAEtaBacYrLXq81+1741+TnvkQrg026GQufpOLBtq3t
ZxJ8U9ZbPhV4U+kWJ1qeHRUmgmmFt08d0ZU08/EywqwkgwrSUn1SUBf+eMIClK6r
55If65RnCnlHvCOmujwWZOXkql1ZHXPzFcmRc90l7ucJLQzC7oK7
-----END RSA PRIVATE KEY-----`

exports.config = {
  dsOauthServer, dsPayload,
  authToken, settings, args, acuerdoFirmado,
  envelopeId, clavesStripe, clavePrivada
};