const nodemailer = require("nodemailer");

const mail = {
    user: 'noreply@3csigma.com',
    pass: '&gxq6DOCYk$I'
}

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: "3csigma.com",
    port: 465,
    // tls: { rejectUnauthorized: false },
    secure: true, // true for 465, false for other ports
    auth: {
        user: mail.user, // generated ethereal user
        pass: mail.pass, // generated ethereal password
    },
});


/** Enviar el email */
const sendEmail = async (email, subject, html) => {
    try {
        await transporter.sendMail({
            from: `3C Sigma <${mail.user}>`, // sender address
            to: email, // list of receivers
            subject, // Subject line
            text: "Saludos, bienvenido a la plataforma 3C Sigma", // plain text body
            html, // html body
        });
    } catch (error) {
        console.log("Ocurrio algo inesperado con el email. ", error);
        return false;
    }
}

/** Obtener plantilla */
const getTemplate = (nombre, empresa, codigo) => {
    return `
    <!DOCTYPE html>
		<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
		<head>
		<title></title>
		<meta content="text/html; charset=utf-8" http-equiv="Content-Type"/>
		<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
		<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
		<!--[if !mso]><!-->
		<link href="https://fonts.googleapis.com/css?family=Lato" rel="stylesheet" type="text/css"/>
		<link href="https://fonts.googleapis.com/css?family=Nunito" rel="stylesheet" type="text/css"/>
		<link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet" type="text/css"/>
		<link href="https://fonts.googleapis.com/css?family=Bitter" rel="stylesheet" type="text/css"/>
		<link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet" type="text/css"/>
		<link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro" rel="stylesheet" type="text/css"/>
		<!--<![endif]-->
		<style>
				* {
					box-sizing: border-box;
				}

				body {
					margin: 0;
					padding: 0;
				}

				a[x-apple-data-detectors] {
					color: inherit !important;
					text-decoration: inherit !important;
				}

				#MessageViewBody a {
					color: inherit;
					text-decoration: none;
				}

				p {
					line-height: inherit
				}

				@media (max-width:620px) {
					.icons-inner {
						text-align: center;
					}

					.icons-inner td {
						margin: 0 auto;
					}

					.row-content {
						width: 100% !important;
					}

					.column .border {
						display: none;
					}

					table {
						table-layout: fixed !important;
					}

					.stack .column {
						width: 100%;
						display: block;
					}
				}
			</style>
		</head>
		<body style="background-color: #f6f6f6; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
		<table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6;" width="100%">
		<tbody>
		<tr>
		<td>
		<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tbody>
		<tr>
		<td>
		<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; color: #000000; width: 600px;" width="600">
		<tbody>
		<tr>
		<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-left: 10px; padding-right: 10px; padding-top: 10px; padding-bottom: 10px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
		<table border="0" cellpadding="35" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tr>
		<td>
		<div align="center" style="line-height:10px"><img src="https://3csigma.com/Images_App_Negocio/email_verification/Email_Verification_Icon.png" style="display: block; height: auto; border: 0; width: 145px; max-width: 100%;" width="145"/></div>
		</td>
		</tr>
		</table>
		<table border="0" cellpadding="0" cellspacing="0" class="heading_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tr>
		<td style="text-align:center;width:100%;">
		<h1 style="margin: 0; color: #393d47; direction: ltr; font-family: 'Source Sans Pro', Tahoma, Verdana, Segoe, sans-serif; font-size: 30px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Hola ${ nombre }!</span></h1>
		</td>
		</tr>
		</table>
		<table border="0" cellpadding="0" cellspacing="0" class="paragraph_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
		<tr>
		<td style="padding-bottom:15px;padding-left:60px;padding-right:60px;padding-top:15px;">
		<div style="color:#393d47;direction:ltr;font-family:'Source Sans Pro', Tahoma, Verdana, Segoe, sans-serif;font-size:14px;font-weight:400;letter-spacing:0px;line-height:180%;text-align:center;">
		<p style="margin: 0;">Para completar el registro de <strong>${ empresa } </strong>en 3C Sigma, Por favor haz clic en el botón "Verificar correo". Serás redireccionado a nuestra plataforma para iniciar sesión.</p>
		</div>
		</td>
		</tr>
		</table>
		<table border="0" cellpadding="0" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tr>
		<td style="padding-bottom:70px;padding-top:10px;text-align:center;">
		<div align="center">
		<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="modificar el codigo del boton aqui" style="height:57px;width:522px;v-text-anchor:middle;" arcsize="9%" stroke="false" fillcolor="#8a3b8f"><w:anchorlock/><v:textbox inset="0px,0px,0px,5px"><center style="color:#ffffff; font-family:Tahoma, Verdana, sans-serif; font-size:13px"><![endif]--><a href="http://localhost:4000/confirmar/${codigo}" style="text-decoration:none;display:block;color:#ffffff;background-color:#8a3b8f;border-radius:5px;width:90%; width:90%;border-top:0px solid #8a3b8f;border-right:0px solid #8a3b8f;border-bottom:0px solid #8a3b8f;border-left:0px solid #8a3b8f;padding-top:10px;padding-bottom:15px;font-family:'Source Sans Pro', Tahoma, Verdana, Segoe, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;" target="_blank"><span style="padding-left:20px;padding-right:20px;font-size:13px;display:inline-block;letter-spacing:1px;"><span style="font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;"><span data-mce-style="font-size: 13px; line-height: 26px;" style="font-size: 13px; line-height: 26px;">VERIFICAR CORREO</span></span></span></a>
		<!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
		</div>
		</td>
		</tr>
		</table>
		</td>
		</tr>
		</tbody>
		</table>
		</td>
		</tr>
		</tbody>
		</table>
		<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tbody>
		<tr>
		<td>
		<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6; color: #000000; width: 600px;" width="600">
		<tbody>
		<tr>
		<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 0px; padding-bottom: 0px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
		<table border="0" cellpadding="0" cellspacing="0" class="image_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tr>
		<td style="padding-bottom:10px;padding-left:10px;padding-right:10px;padding-top:30px;width:100%;">
		<div align="center" style="line-height:10px"><img src="https://3csigma.com/Images_App_Negocio/email_verification/Logo.png" style="display: block; height: auto; border: 0; width: 120px; max-width: 100%;" width="120"/></div>
		</td>
		</tr>
		</table>
		<table border="0" cellpadding="10" cellspacing="0" class="paragraph_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
		<tr>
		<td>
		<div style="color:#393d47;direction:ltr;font-family:'Source Sans Pro', Tahoma, Verdana, Segoe, sans-serif;font-size:16px;font-weight:700;letter-spacing:0px;line-height:120%;text-align:center;">
		<p style="margin: 0;">3C Sigma ® 2022</p>
		</div>
		</td>
		</tr>
		</table>
		<table border="0" cellpadding="10" cellspacing="0" class="paragraph_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%">
		<tr>
		<td>
		<div style="color:#000000;direction:ltr;font-family:'Source Sans Pro', Tahoma, Verdana, Segoe, sans-serif;font-size:14px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:center;">
		<p style="margin: 0;"><strong>¿Tienes dudas?</strong> Escríbenos a <a href="mailto:hello@3csigma.com" rel="noopener" style="text-decoration: none; color: #0068a5;" target="_blank" title="hello@3csigma.com">hello@3csigma.com</a></p>
		</div>
		</td>
		</tr>
		</table>
		</td>
		</tr>
		</tbody>
		</table>
		</td>
		</tr>
		</tbody>
		</table>
		<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tbody>
		<tr>
		<td>
		<table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6; color: #000000; width: 600px;" width="600">
		<tbody>
		<tr>
		<td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%">
		<table border="0" cellpadding="10" cellspacing="0" class="social_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tr>
		<td>
		<table align="center" border="0" cellpadding="0" cellspacing="0" class="social-table" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="138px">
		<tr>
		<td style="padding:0 7px 0 7px;"><a href="https://facebook.com/carlosjramirezp" target="_blank"><img alt="Facebook" height="32" src="https://3csigma.com/Images_App_Negocio/email_verification/facebook2x.png" style="display: block; height: auto; border: 0;" title="Facebook" width="32"/></a></td>
		<td style="padding:0 7px 0 7px;"><a href="https://instagram.com/carlosjramirezp" target="_blank"><img alt="Instagram" height="32" src="https://3csigma.com/Images_App_Negocio/email_verification/instagram2x.png" style="display: block; height: auto; border: 0;" title="Instagram" width="32"/></a></td>
		<td style="padding:0 7px 0 7px;"><a href="www.3csigma.com" target="_blank"><img alt="Website 3C Sigma" height="32" src="https://3csigma.com/Images_App_Negocio/email_verification/Pagina-web.png" style="display: block; height: auto; border: 0;" title="Website" width="32"/></a></td>
		</tr>
		</table>
		</td>
		</tr>
		</table>
		</td>
		</tr>
		</tbody>
		</table>
		</td>
		</tr>
		</tbody>
		</table>
		<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
		<tbody>
		<tr>
		<td>
		</td>
		</tr>
		</tbody>
		</table>
		</td>
		</tr>
		</tbody>
		</table><!-- End -->
		</body>
		</html>
      `;
}

module.exports = {
    sendEmail, getTemplate
}