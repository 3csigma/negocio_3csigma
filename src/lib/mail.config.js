const nodemailer = require("nodemailer");

const mail = {
    user: 'noreply@3csigma.com',
    pass: '&gxq6DOCYk$I'
}

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: "mail.3csigma.com",
    port: 2079,
    tls: { rejectUnauthorized: false },
    secure: false, // true for 465, false for other ports
    auth: {
        user: mail.user, // generated ethereal user
        pass: mail.pass, // generated ethereal password
    },
});


/** Enviar el email */
const sendEmail = async (email, subject, html, res) => {
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
const getTemplate = (nombre, codigo) => {
    return `
    <head><link rel="stylesheet" href="./css/email.css"></head>
    <div id="email_content">
        <h2>Hola! ${nombre}</h2>
        <p>Para confirmar tu cuenta, ingresa al siguiente enlace:
        <a href="localhost:4000/confirmar/${codigo}"> Activar cuenta</a>
        </p>
    </div>
    `
}

module.exports = {
    sendEmail, getTemplate
}
// // send mail with defined transport object
// let info = await transporter.sendMail({
//     from: '"Fred Foo 👻" <foo@example.com>', // sender address
//     to: "bar@example.com, baz@example.com", // list of receivers
//     subject: "Hello ✔", // Subject line
//     text: "Hello world?", // plain text body
//     html: "<b>Hello world?</b>", // html body
// });

// console.log("Message sent: %s", info.messageId);
// // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

// // Preview only available when sending through an Ethereal account
// console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));