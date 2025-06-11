const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // O usa SMTP de tu institución
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

module.exports = async function enviarCorreo(to, subject, html) {
    try {
        await transporter.sendMail({
            from: `"GOE" <${process.env.EMAIL_USER}>`,  
            to,
            subject,
            html
        });
        return true;
    } catch (error) {
        console.error('Error al enviar correo:', error);
        return false;
    }
};
