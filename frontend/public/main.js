// URL de backend
const BACKEND_URL = 'https://clubplaya-backend2-h4hse2fze5decze4.canadacentral-01.azurewebsites.net';

// ===== TOKEN =====
function guardarToken(token){ localStorage.setItem('token', token); }
function obtenerToken(){ return localStorage.getItem('token'); }
function eliminarToken(){ localStorage.removeItem('token'); }

// ===== USUARIO =====
function obtenerUsuarioDesdeToken(){
  const token = obtenerToken();
  if(!token) return null;
  try{
    return JSON.parse(atob(token.split('.')[1])).email;
  }catch{ return null; }
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
  .catch(err=>{ if(authMensaje) authMensaje.textContent=`⚠️ ${err.message}`; });
}

// ===== MAPA Y RESERVAS =====
let map, geojsonLayer;

function inicializarMapa(){
  if(map){ map.remove(); map=null; geojsonLayer=null; }

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
  if(!usuario){ alert('⚠️ Debes iniciar sesión para reservar.'); return; }

  const datosReserva = { nombre, horario, usuario, precio };
  fetch(`${BACKEND_URL}/api/reservas`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(datosReserva)
  })
  .then(res=>res.json())
  .then(data=>{
    if(data.error) throw new Error(data.error);
    alert(`✅ Reserva exitosa: ${nombre} - Horario ${horario}`);
    recargarMapa();
  })
  .catch(err=>{ console.error(err); alert(`❌ Error al reservar: ${err.message}`); });
}

// ===== SIMULACIÓN DE PAGO =====
async function pagarReserva(nombre, horario, precio){
  const usuario = obtenerUsuarioDesdeToken();
  if(!usuario){ alert('⚠️ Debes iniciar sesión para pagar.'); return; }

  const tarjeta = prompt('Ingresa número de tarjeta (simulación):','4111 1111 1111 1111');
  if(!tarjeta){ alert('Pago cancelado'); return; }
  const cvv = prompt('Ingresa CVV:','123'); if(!cvv){ alert('Pago cancelado'); return; }
  const venc = prompt('Fecha de vencimiento (MM/AA):','12/25'); if(!venc){ alert('Pago cancelado'); return; }

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

    alert(`✅ Pago exitoso! ID Transacción: ${data.transactionId}`);
    recargarMapa();
  }catch(err){ alert(`❌ Error en pago: ${err.message}`); }
}

// ===== PAGO DE TODAS LAS RESERVAS =====
async function pagarTodasReservas(){
  const usuario = obtenerUsuarioDesdeToken();
  if(!usuario){ alert('⚠️ Debes iniciar sesión para pagar.'); return; }

  const res = await fetch(`${BACKEND_URL}/api/reservas?usuario=${encodeURIComponent(usuario)}`);
  const reservas = await res.json();
  if(!reservas || reservas.length===0){ alert('No tienes reservas para pagar.'); return; }

  const total = reservas.reduce((acc,r)=>acc+r.precio,0);

  const tarjeta = prompt(`Monto total: $${total}\nIngresa número de tarjeta:`,'4111 1111 1111 1111');
  if(!tarjeta){ alert('Pago cancelado'); return; }
  const cvv = prompt('CVV:','123'); if(!cvv){ alert('Pago cancelado'); return; }
  const venc = prompt('Fecha de vencimiento (MM/AA):','12/25'); if(!venc){ alert('Pago cancelado'); return; }

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

    alert('✅ Pago completo y correo enviado con todos los montos.');
    recargarMapa();
  }catch(err){ alert('❌ Error al procesar el pago: '+err.message); }
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
  const lista=document.getElementById('listaReservas'); lista.innerHTML='';
  const usuario = obtenerUsuarioDesdeToken();
  fetch(`${BACKEND_URL}/api/reservas?usuario=${encodeURIComponent(usuario)}`)
    .then(res=>res.json())
    .then(reservas=>{
      if(!reservas||reservas.length===0){ lista.innerHTML='<li>No tienes reservas aún.</li>'; document.getElementById('modalReservas').style.display='flex'; return; }
      reservas.forEach(r=>{
        const li=document.createElement('li');
        li.textContent=`${r.nombre} - Usuario: ${r.usuario} - Horario: ${r.horario} - $${r.precio}`;
        const btnCancelar=document.createElement('button');
        btnCancelar.textContent='Cancelar';
        btnCancelar.onclick=()=>{ 
          if(!confirm(`¿Cancelar la reserva de ${r.nombre} (${r.horario})?`)) return;
          fetch(`${BACKEND_URL}/api/reservas/${encodeURIComponent(r.nombre)}/${encodeURIComponent(r.horario)}?usuario=${encodeURIComponent(usuario)}`,{method:'DELETE'})
            .then(res=>{ if(!res.ok) throw new Error('Error al cancelar reserva'); return res.json(); })
            .then(()=>{ alert('Reserva cancelada.'); li.remove(); recargarMapa(); })
            .catch(err=>{ console.error(err); alert('No se pudo cancelar la reserva.'); });
        };
        li.appendChild(btnCancelar);
        lista.appendChild(li);
      });
      document.getElementById('modalReservas').style.display='flex';
    })
    .catch(err=>{ console.error(err); alert('No se pudieron cargar las reservas.'); });
});

function cerrarModal(){ document.getElementById('modalReservas').style.display='none'; }

document.getElementById('btnLimpiarReservas')?.addEventListener('click', async ()=>{
  if(!confirm('¿Cancelar todas tus reservas?')) return;
  const usuario = obtenerUsuarioDesdeToken();
  const res = await fetch(`${BACKEND_URL}/api/reservas?usuario=${encodeURIComponent(usuario)}`);
  const reservas = await res.json();
  const promesas = reservas.map(r=>fetch(`${BACKEND_URL}/api/reservas/${encodeURIComponent(r.nombre)}/${encodeURIComponent(r.horario)}?usuario=${encodeURIComponent(usuario)}`,{method:'DELETE'}));
  await Promise.all(promesas);
  alert('Todas las reservas canceladas ✅');
  recargarMapa();
});

// ===== CERRAR SESIÓN =====
document.getElementById('btnCerrarSesion')?.addEventListener('click',()=>{
  eliminarToken(); alert('Sesión cerrada');
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

// ===== BOTONES LOGIN/REGISTRO =====
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
  btnPagarTodas.onclick = pagarTodasReservas;
  filtrosDiv.appendChild(btnPagarTodas);
}
