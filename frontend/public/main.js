// =================================================================
// CONFIGURACIÓN DE URL DE BACKEND
// Usamos la URL que has proporcionado, solucionando el "Failed to fetch"
// =================================================================
const BACKEND_URL = 'https://clubplaya-backend2-h4hse2fze5decze4.canadacentral-01.azurewebsites.net';

// ===== UTILIDADES DE MENSAJES NO BLOQUEANTES (Reemplazo de alert/confirm/prompt) =====
/**
 * Muestra un mensaje temporal en la esquina superior derecha de la pantalla (para reemplazar alert).
 * @param {string} message Mensaje a mostrar.
 * @param {boolean} isError Si es un error (rojo).
 */
function mostrarAlertaTemporal(message, isError = false) {
    let alertBox = document.getElementById('temp-alert-box');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'temp-alert-box';
        // Estilos para que se vea bien en cualquier parte de la pantalla
        alertBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: 'Roboto', sans-serif;
            font-size: 1rem;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.5s, transform 0.5s;
            transform: translateY(-20px);
        `;
        document.body.appendChild(alertBox);
    }
    
    alertBox.textContent = message;
    alertBox.style.backgroundColor = isError ? '#ff6b6b' : '#06d6a0';
    alertBox.style.color = 'white';

    // Mostrar y ocultar
    alertBox.style.opacity = 1;
    alertBox.style.transform = 'translateY(0)';
    setTimeout(() => {
        alertBox.style.opacity = 0;
        alertBox.style.transform = 'translateY(-20px)';
    }, 4000);
}


// ===== TOKEN =====
function guardarToken(token){ localStorage.setItem('token', token); }
function obtenerToken(){ return localStorage.getItem('token'); }
function eliminarToken(){ localStorage.removeItem('token'); }

// ===== USUARIO =====
function obtenerUsuarioDesdeToken(){
    const token = obtenerToken();
    if(!token) return null;
    try{
        // El token viene en formato JWT, decodificamos la parte del payload (índice 1)
        return JSON.parse(atob(token.split('.')[1])).email;
    }catch(e){ 
        console.error("Error decodificando token:", e);
        return null; 
    }
}

function mostrarUsuario(){
    const usuario = obtenerUsuarioDesdeToken();
    const authMensaje = document.getElementById('authMensaje');
    if(usuario && authMensaje) authMensaje.textContent = `Sesión activa como: ${usuario}`;
}

// ===== LOGIN / REGISTRO =====
function registrarse(){
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const authMensaje = document.getElementById('authMensaje');
    if(!email||!password){ if(authMensaje) authMensaje.textContent='Completa todos los campos'; return; }

    fetch(`${BACKEND_URL}/api/register`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
    })
    .then(res=>res.json())
    .then(data=>{
        if(data.error) throw new Error(data.error);
        if(authMensaje) authMensaje.textContent='Registro exitoso. Ahora inicia sesión.';
    })
    .catch(err=>{ if(authMensaje) authMensaje.textContent=`⚠️ ${err.message}`; });
}

function iniciarSesion(){
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const authMensaje = document.getElementById('authMensaje');
    if(!email||!password){ if(authMensaje) authMensaje.textContent='Completa todos los campos'; return; }

    fetch(`${BACKEND_URL}/api/login`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
    })
    .then(res=>res.json())
    .then(data=>{
        if(data.error) throw new Error(data.error);
        guardarToken(data.token);
        mostrarUsuario();
        window.location.href='mapa.html';
    })
    .catch(err=>{ 
        if(authMensaje) authMensaje.textContent=`⚠️ Error de conexión o credenciales: ${err.message}`; 
        console.error('Error en iniciarSesion:', err);
    });
}

// ===== MAPA Y RESERVAS =====
let map, geojsonLayer;

function inicializarMapa(){
    if(map){ map.remove(); map=null; geojsonLayer=null; }

    // Asegurarse de que Leaflet esté cargado (si no lo está en mapa.html)
    if (typeof L === 'undefined') {
        console.error("Leaflet no está cargado. Asegúrate de incluir los scripts en mapa.html");
        return;
    }

    map = L.map('mapContainer').setView([20.684,-105.2],16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'&copy; OpenStreetMap contributors' }).addTo(map);

    fetch(`${BACKEND_URL}/api/mapa`)
        .then(res=>res.json())
        .then(data=>{
            geojsonLayer=L.geoJSON(data,{
                style: feature=>{
                    const e=feature.properties.estado;
                    if(typeof e==='object'){
                        if(Object.values(e).some(v=>'bloqueado'===v)) return {color:'red',weight:2};
                        if(Object.values(e).every(v=>'reservado'===v)) return {color:'yellow',weight:2};
                        return {color:'green',weight:2};
                    }
                    return {color:e==='bloqueado'?'red':e==='reservado'?'yellow':'green',weight:2};
                },
                onEachFeature:(feature,layer)=>{
                    const p=feature.properties;
                    if(typeof p.estado==='object' && p.tipo){
                        layer.bindPopup(`
                            <strong>${p.nombre}</strong><br>
                            Tipo: ${p.tipo}<br>
                            Precio: $${p.precio}<br><br>
                            Horario:
                            <select onchange="this.dataset.selectedHorario=this.value">
                                <option value="AM" ${p.estado.AM==='reservado'?'disabled':''}>AM (${p.estado.AM})</option>
                                <option value="PM" ${p.estado.PM==='reservado'?'disabled':''}>PM (${p.estado.PM})</option>
                                <option value="Completo" ${p.estado.Completo==='reservado'?'disabled':''}>Completo (${p.estado.Completo})</option>
                            </select><br><br>
                            <button onclick="reservar('${p.nombre}', this.parentElement.querySelector('select').value, ${p.precio})">Reservar</button>
                            <button onclick="pagarReserva('${p.nombre}', this.parentElement.querySelector('select').value, ${p.precio})">Pagar</button>
                        `);
                    }
                }
            }).addTo(map);
            map.fitBounds(geojsonLayer.getBounds());
            document.getElementById('filtroTipo')?.addEventListener('change',aplicarFiltros);
            document.getElementById('filtroEstado')?.addEventListener('change',aplicarFiltros);
            aplicarFiltros();
        })
        .catch(err=>console.error('Error cargando mapa:',err));
}

// ===== FILTROS =====
function aplicarFiltros(){
    if(!geojsonLayer) return;
    const filtroTipo=document.getElementById('filtroTipo')?.value||'todos';
    const filtroEstado=document.getElementById('filtroEstado')?.value||'todos';
    geojsonLayer.eachLayer(layer=>{
        const p=layer.feature.properties;
        let estadoParaFiltro;
        if(typeof p.estado==='object'){
            if(Object.values(p.estado).some(e=>'bloqueado'===e)) estadoParaFiltro='bloqueado';
            else if(Object.values(p.estado).every(e=>'reservado'===e)) estadoParaFiltro='reservado';
            else estadoParaFiltro='disponible';
        }else estadoParaFiltro=p.estado;
        const cumpleTipo=filtroTipo==='todos'||p.tipo===filtroTipo;
        const cumpleEstado=filtroEstado==='todos'||estadoParaFiltro===filtroEstado;
        cumpleTipo && cumpleEstado ? layer.addTo(map) : map.removeLayer(layer);
    });
}

// ===== RESERVAR =====
function reservar(nombre, horario, precio){
    const usuario = obtenerUsuarioDesdeToken();
    if(!usuario){ 
        mostrarAlertaTemporal('⚠️ Debes iniciar sesión para reservar.', true); 
        return; 
    }

    const datosReserva = { nombre, horario, usuario, precio };
    fetch(`${BACKEND_URL}/api/reservas`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(datosReserva)
    })
    .then(res=>res.json())
    .then(data=>{
        if(data.error) throw new Error(data.error);
        mostrarAlertaTemporal(`✅ Reserva exitosa: ${nombre} - Horario ${horario}`);
        recargarMapa();
    })
    .catch(err=>{ 
        console.error(err); 
        mostrarAlertaTemporal(`❌ Error al reservar: ${err.message}`, true); 
    });
}

// ===== SIMULACIÓN DE PAGO (Reemplazamos prompt con datos simulados) =====
async function pagarReserva(nombre, horario, precio){
    const usuario = obtenerUsuarioDesdeToken();
    if(!usuario){ 
        mostrarAlertaTemporal('⚠️ Debes iniciar sesión para pagar.', true); 
        return; 
    }

    // Sustitución de prompt() por valores de prueba no bloqueantes
    const tarjeta = '4111 1111 1111 1111'; // Dummy
    const cvv = '123'; // Dummy
    const venc = '12/25'; // Dummy
    
    // El usuario debe seleccionar el horario antes de hacer clic en pagar
    if (!horario) {
        mostrarAlertaTemporal('Debes seleccionar un horario para pagar.', true);
        return;
    }

    try{
        const res = await fetch(`${BACKEND_URL}/api/reservas/pagar`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({nombre,horario,usuario,precio,tarjeta,cvv,venc})
        });
        const data = await res.json();
        if(data.error) throw new Error(data.error);

        await fetch(`${BACKEND_URL}/api/reservas/enviar-correo`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ usuario, items:[{nombre,horario,precio}], total:precio, paymentId:data.transactionId })
        });

        mostrarAlertaTemporal(`✅ Pago exitoso! ID Transacción: ${data.transactionId}`);
        recargarMapa();
    }catch(err){ 
        mostrarAlertaTemporal(`❌ Error en pago: ${err.message}`, true); 
    }
}

// ===== PAGO DE TODAS LAS RESERVAS (Reemplazamos prompt con datos simulados) =====
async function pagarTodasReservas(){
    const usuario = obtenerUsuarioDesdeToken();
    if(!usuario){ 
        mostrarAlertaTemporal('⚠️ Debes iniciar sesión para pagar.', true); 
        return; 
    }

    const res = await fetch(`${BACKEND_URL}/api/reservas?usuario=${encodeURIComponent(usuario)}`);
    const reservas = await res.json();
    if(!reservas || reservas.length===0){ 
        mostrarAlertaTemporal('No tienes reservas para pagar.', false); 
        return; 
    }

    const total = reservas.reduce((acc,r)=>acc+r.precio,0);

    // Sustitución de prompt() por valores de prueba no bloqueantes
    const tarjeta = '4111 1111 1111 1111'; 
    const cvv = '123'; 
    const venc = '12/25'; 

    try{
        const pagos = await Promise.all(reservas.map(r=>
            fetch(`${BACKEND_URL}/api/reservas/pagar`,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({nombre:r.nombre,horario:r.horario,usuario,precio:r.precio,tarjeta,cvv,venc})
            }).then(res=>res.json())
        ));

        await fetch(`${BACKEND_URL}/api/reservas/enviar-correo`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                usuario,
                items: reservas.map(r=>({nombre:r.nombre,horario:r.horario,precio:r.precio})),
                total,
                paymentId: pagos.map(p=>p.transactionId).join(', ')
            })
        });

        mostrarAlertaTemporal('✅ Pago completo y correo enviado con todos los montos.');
        recargarMapa();
    }catch(err){ 
        mostrarAlertaTemporal('❌ Error al procesar el pago: '+err.message, true); 
    }
}

// ===== RECARGAR MAPA =====
function recargarMapa(){
    if(!map) return;
    fetch(`${BACKEND_URL}/api/mapa`)
        .then(res=>res.json())
        .then(data=>{ geojsonLayer.clearLayers(); geojsonLayer.addData(data); aplicarFiltros(); })
        .catch(err=>console.error('Error al recargar mapa:',err));
}

// ===== MOSTRAR RESERVAS =====
document.getElementById('btnReservas')?.addEventListener('click',()=>{
    const lista=document.getElementById('listaReservas'); 
    if (!lista) return; // Si no estamos en mapa.html, no hacer nada

    lista.innerHTML='';
    const usuario = obtenerUsuarioDesdeToken();
    
    if(!usuario){
        lista.innerHTML='<li>Debes iniciar sesión para ver tus reservas.</li>';
        document.getElementById('modalReservas').style.display='flex';
        return;
    }

    fetch(`${BACKEND_URL}/api/reservas?usuario=${encodeURIComponent(usuario)}`)
        .then(res=>res.json())
        .then(reservas=>{
            if(!reservas||reservas.length===0){ 
                lista.innerHTML='<li>No tienes reservas aún.</li>'; 
                document.getElementById('modalReservas').style.display='flex'; 
                return; 
            }
            reservas.forEach(r=>{
                const li=document.createElement('li');
                li.textContent=`${r.nombre} - Usuario: ${r.usuario} - Horario: ${r.horario} - $${r.precio}`;
                const btnCancelar=document.createElement('button');
                btnCancelar.textContent='Cancelar';
                btnCancelar.onclick=()=>{ 
                    // Sustitución de confirm() para evitar bloqueo. Procedemos directamente.
                    console.warn(`Intento de cancelar reserva: ${r.nombre} (${r.horario}).`); 
                    
                    fetch(`${BACKEND_URL}/api/reservas/${encodeURIComponent(r.nombre)}/${encodeURIComponent(r.horario)}?usuario=${encodeURIComponent(usuario)}`,{method:'DELETE'})
                        .then(res=>{ if(!res.ok) throw new Error('Error al cancelar reserva'); return res.json(); })
                        .then(()=>{ 
                            mostrarAlertaTemporal('Reserva cancelada.'); 
                            li.remove(); 
                            recargarMapa(); 
                        })
                        .catch(err=>{ 
                            console.error(err); 
                            mostrarAlertaTemporal('No se pudo cancelar la reserva.', true); 
                        });
                };
                li.appendChild(btnCancelar);
                lista.appendChild(li);
            });
            document.getElementById('modalReservas').style.display='flex';
        })
        .catch(err=>{ console.error(err); mostrarAlertaTemporal('No se pudieron cargar las reservas.', true); });
});

function cerrarModal(){ document.getElementById('modalReservas').style.display='none'; }

document.getElementById('btnLimpiarReservas')?.addEventListener('click', async ()=>{
    // Sustitución de confirm() para evitar bloqueo. Procedemos directamente.
    console.warn('Procediendo a cancelar todas las reservas del usuario.');
    
    const usuario = obtenerUsuarioDesdeToken();
    if (!usuario) {
        mostrarAlertaTemporal('Debes iniciar sesión para limpiar reservas.', true);
        return;
    }
    
    const res = await fetch(`${BACKEND_URL}/api/reservas?usuario=${encodeURIComponent(usuario)}`);
    const reservas = await res.json();
    
    const promesas = reservas.map(r=>fetch(`${BACKEND_URL}/api/reservas/${encodeURIComponent(r.nombre)}/${encodeURIComponent(r.horario)}?usuario=${encodeURIComponent(usuario)}`,{method:'DELETE'}));
    
    try {
        await Promise.all(promesas);
        mostrarAlertaTemporal('Todas las reservas canceladas ✅');
        recargarMapa();
        document.getElementById('modalReservas').style.display='none';
    } catch (e) {
        console.error("Error al cancelar en lote:", e);
        mostrarAlertaTemporal("Ocurrió un error al cancelar las reservas.", true);
    }
});

// ===== CERRAR SESIÓN =====
document.getElementById('btnCerrarSesion')?.addEventListener('click',()=>{
    eliminarToken(); 
    mostrarAlertaTemporal('Sesión cerrada');
    if(map){ map.remove(); map=null; geojsonLayer=null; }
    window.location.href='index.html';
});

// ===== AL CARGAR =====
document.addEventListener('DOMContentLoaded',()=>{
    const token=obtenerToken();
    if(token && document.getElementById('mapContainer')){
        mostrarUsuario();
        inicializarMapa();
    }
});

// ===== BOTONES LOGIN/REGISTRO (Ya estaban correctos) =====
document.getElementById('btnRegistro')?.addEventListener('click',registrarse);
document.getElementById('btnLogin')?.addEventListener('click',iniciarSesion);

// ===== BOTÓN NUEVO: PAGAR TODAS LAS RESERVAS =====
const filtrosDiv = document.getElementById('filtros');
if(filtrosDiv){
    const btnPagarTodas = document.createElement('button');
    btnPagarTodas.textContent = "Pagar Todas";
    btnPagarTodas.style.background = "#06d6a0"; 
    btnPagarTodas.style.color = "white"; 
    btnPagarTodas.style.border = "none"; 
    btnPagarTodas.style.borderRadius = "5px"; 
    btnPagarTodas.style.cursor = "pointer"; 
    btnPagarTodas.style.padding = "5px 10px";
    btnPagarTodas.style.marginLeft = "10px";
    btnPagarTodas.onclick = pagarTodasReservas;
    filtrosDiv.appendChild(btnPagarTodas);
}
