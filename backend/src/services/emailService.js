const nodemailer = require('nodemailer');

// Objeto transportador global
let transporter;

/**
 * Inicializa el transportador de Nodemailer.
 * * En modo de desarrollo, usa Ethereal (simulación).
 * En modo de producción, usa un servicio SMTP real configurado con variables de entorno.
 */
async function initializeEmailTransporter() {
    // Si ya está inicializado, retorna la instancia existente.
    if (transporter) {
        return transporter;
    }
    
    // Configuración real (usando variables de entorno)
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;

    // Determina si estamos usando el modo de producción (variables de entorno definidas)
    const isProductionMode = SMTP_HOST && SMTP_USER && SMTP_PASS;

    if (isProductionMode) {
        // --- MODO PRODUCCIÓN: Usar variables de entorno reales ---
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT || 587, // Por defecto usa 587 si no se especifica
            secure: SMTP_PORT == 465, // true para 465 (SSL), false para 587 (STARTTLS)
            auth: {
                user: SMTP_USER, // Tu usuario/email de SMTP real
                pass: SMTP_PASS, // Tu contraseña o clave de API de SMTP real
            },
            // --- CORRECCIÓN IMPORTANTE PARA EL ERROR 'self-signed certificate' LOCAL ---
            // Esto es necesario en entornos de desarrollo local para SMTP de servicios
            // como Outlook/Gmail para evitar fallos de cadena de certificados.
            tls: {
                rejectUnauthorized: false,
            },
            // --------------------------------------------------------------------------
        });
        console.log(`[EMAIL MOCK] Nodemailer configurado en MODO PRODUCCIÓN. Host: ${SMTP_HOST}`);

    } else {
        // --- MODO DESARROLLO (FALLBACK): Usar Ethereal ---
        const testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
            // Se mantiene la corrección para el certificado autofirmado de Ethereal
            tls: {
                rejectUnauthorized: false,
            },
        });
        
        // Muestra la URL de previsualización de Ethereal
        console.log(`[EMAIL MOCK] Nodemailer configurado en MODO DESARROLLO (Ethereal). Ver correos en: ${nodemailer.getTestMessageUrl(transporter.options)}`);
    }

    return transporter;
}

/**
 * Envía un correo de confirmación de reserva.
 */
async function sendConfirmationEmail(recipientEmail, reservationDetails) {
    try {
        const transporter = await initializeEmailTransporter();
        
        // --- MANEJO DEL DESTINATARIO ---
        // Si el destinatario no contiene '@', creamos un email de prueba válido SOLO si no estamos en producción.
        let finalRecipient = recipientEmail;
        const isEthereal = transporter.options.host === "smtp.ethereal.email";

        if (isEthereal && (!finalRecipient || !finalRecipient.includes('@'))) {
            console.warn(`[EMAIL MOCK] Destinatario '${recipientEmail}' no parece ser un email. Usando fallback para test: ${recipientEmail}@test.com`);
            finalRecipient = `${recipientEmail}@test.com`;
        }
        // Nota: En producción, si el email es inválido, el servicio SMTP real rechazará el correo.
        // ---------------------------------------------


        // Contenido del correo
        const emailContent = `
            <h2>¡Reserva Confirmada Exitosamente!</h2>
            <p>Gracias por tu pago. Tu reserva ha sido confirmada:</p>
            <ul>
                <li><strong>Espacio:</strong> ${reservationDetails.nombre}</li>
                <li><strong>Horario:</strong> ${reservationDetails.horario}</li>
                <li><strong>Monto Pagado:</strong> $${reservationDetails.precio.toFixed(2)}</li>
                <li><strong>ID de Transacción:</strong> ${reservationDetails.paymentId}</li>
            </ul>
            <p>¡Te esperamos en el club de playa!</p>
        `;

        const info = await transporter.sendMail({
            from: '"Playa App" <noreply@playaapp.com>', // remitente
            to: finalRecipient, // Destinatario corregido/validado
            subject: "Confirmación de Reserva Exitosa", // Asunto
            html: emailContent, // Cuerpo en HTML
        });

        console.log(`[EMAIL MOCK] Mensaje enviado: %s`, info.messageId);
        
        // Solo muestra la URL de previsualización si estamos en Ethereal
        if (isEthereal) {
            console.log("URL de previsualización del correo: %s", nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error(`[EMAIL MOCK] Error al enviar correo a ${recipientEmail}:`, error);
        // Lanzamos un error más genérico para que el server.js lo capture
        throw new Error('Fallo al enviar el correo de confirmación.');
    }
}

module.exports = {
    sendConfirmationEmail
};
