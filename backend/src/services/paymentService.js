/**
 * Servicio de Pago - Simulación de Interacción con Pasarela (e.g., PayPal)
 * * En una aplicación real, este módulo contendría la lógica para:
 * 1. Configurar el SDK de PayPal (o hacer peticiones directas a la API REST).
 * 2. Crear, ejecutar y capturar la orden de pago.
 * 3. Manejar tokens y errores de la transacción.
 */

// Simula la función que se comunicaría con PayPal o cualquier pasarela de pago.
async function processPayment(reservationDetails) {
    return new Promise((resolve, reject) => {
        // Simulación: Tarda entre 500ms y 1500ms en procesar.
        const processingTime = Math.random() * 1000 + 500;
        
        setTimeout(() => {
            // Simulación de fallo (10% de probabilidad)
            if (Math.random() < 0.10) {
                console.error(`[PAYPAL MOCK] Fallo simulado para el usuario: ${reservationDetails.usuario}`);
                return reject(new Error('Pago rechazado por el banco o pasarela de pago. Intente de nuevo.'));
            }

            // Simulación de éxito
            const transactionId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            console.log(`[PAYPAL MOCK] Pago exitoso. ID de Transacción: ${transactionId}`);
            
            resolve({
                success: true,
                transactionId: transactionId,
                status: 'CAPTURED',
                amount: reservationDetails.precio,
            });
        }, processingTime);
    });
}

module.exports = {
    processPayment
};