let citaActivaSimulacion = null;

document.addEventListener('DOMContentLoaded', async () => {
  await cargarUltimaCitaParaSimular();
  
  document.getElementById('input-mensaje').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensajeSimulado();
  });
});

async function cargarUltimaCitaParaSimular() {
  const container = document.getElementById('chat-mensajes');
  
  if (MODO_OFFLINE) {
    const guardadas = JSON.parse(localStorage.getItem('citas_locales') || '[]');
    citaActivaSimulacion = guardadas[guardadas.length - 1] || null;
  } else {
    const { data } = await supabaseClient
      .from('citas')
      .select('*, negocios(nombre), servicios(nombre)')
      .eq('negocio_id', NEGOCIO_DEFAULT_ID)
      .order('fecha_hora_inicio', { ascending: false })
      .limit(1);
    
    citaActivaSimulacion = data?.[0] || null;
  }

  if (!citaActivaSimulacion) {
    container.innerHTML = `<div style="background: #fff; padding: 10px 14px; border-radius: 8px; max-width: 80%; align-self: flex-start;">
      <strong>Sistema Bot:</strong> No hay citas recientes en la base de datos. Por favor agenda una primero en <a href="agendar.html" target="_blank">agendar.html</a>.
    </div>`;
    return;
  }

  agregarBurbujaBot(`Hola <strong>${citaActivaSimulacion.cliente_nombre}</strong>, te saludamos de <strong>Consultorio Dental Obregón</strong> para recordarte tu cita programada para el día <strong>${citaActivaSimulacion.fecha_hora_inicio.split('T')[0]}</strong>. ¿Confirma su asistencia?<br><br>👉 Responde <strong>SI</strong> para confirmar o <strong>CANCELAR</strong> si deseas reprogramar.`);
}

function agregarBurbujaBot(htmlTexto) {
  const container = document.getElementById('chat-mensajes');
  container.innerHTML += `
    <div style="background: #ffffff; padding: 12px 16px; border-radius: 8px; max-width: 80%; align-self: flex-start; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
      <span style="font-size: 0.75rem; color: var(--muted); display: block; margin-bottom: 2px;">🤖 Bot Automatizado (WhatsApp)</span>
      ${htmlTexto}
    </div>
  `;
  container.scrollTop = container.scrollHeight;
}

function agregarBurbujaCliente(texto) {
  const container = document.getElementById('chat-mensajes');
  container.innerHTML += `
    <div style="background: #d9fdd3; padding: 12px 16px; border-radius: 8px; max-width: 80%; align-self: flex-end; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
      <span style="font-size: 0.75rem; color: var(--muted); display: block; margin-bottom: 2px;">👤 Cliente</span>
      ${texto}
    </div>
  `;
  container.scrollTop = container.scrollHeight;
}

async function simularEnvioRecordatorio() {
  document.getElementById('chat-mensajes').innerHTML = '';
  await cargarUltimaCitaParaSimular();
}

async function enviarMensajeSimulado() {
  const input = document.getElementById('input-mensaje');
  const texto = input.value.trim();
  
  // CORREGIDO: ahora evalúa correctamente `!texto` y valida que exista cita activa
  if (!texto || !citaActivaSimulacion) return;

  agregarBurbujaCliente(texto);
  input.value = '';

  const respuestaUpper = texto.toUpperCase();
  let respuestaBot = "";
  let nuevoEstado = null;

  if (respuestaUpper.includes('SI') || respuestaUpper.includes('CONFIRMO') || respuestaUpper.includes('SÍ')) {
    respuestaBot = "¡Muchas gracias! Su cita ha quedado <strong>confirmada</strong> exitosamente. Lo esperamos en el consultorio.";
    nuevoEstado = 'confirmada';
  } else if (respuestaUpper.includes('CANCELAR') || respuestaUpper.includes('NO')) {
    respuestaBot = "Entendido. Su cita ha sido <strong>cancelada</strong>. Si desea reagendar, puede hacerlo en nuestro enlace web.";
    nuevoEstado = 'cancelada';
  } else {
    respuestaBot = "Disculpe, no comprendí bien su mensaje. Por favor responda <strong>SI</strong> para confirmar su asistencia o <strong>CANCELAR</strong> para anular la cita.";
  }

  if (nuevoEstado) {
    if (MODO_OFFLINE) {
      const guardadas = JSON.parse(localStorage.getItem('citas_locales') || '[]');
      const actualizadas = guardadas.map(c => c.id === citaActivaSimulacion.id ? { ...c, estado: nuevoEstado } : c);
      localStorage.setItem('citas_locales', JSON.stringify(actualizadas));
    } else {
      await supabaseClient.from('citas').update({ estado: nuevoEstado }).eq('id', citaActivaSimulacion.id);
    }
    citaActivaSimulacion.estado = nuevoEstado;
  }

  setTimeout(() => {
    agregarBurbujaBot(respuestaBot);
  }, 800);
}