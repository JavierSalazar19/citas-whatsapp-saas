let negocioActual = null;

document.addEventListener('DOMContentLoaded', async () => {
  const hoy = new Date().toISOString().split('T')[0];
  const inputFiltro = document.getElementById('filtro-fecha');
  inputFiltro.value = hoy;

  await cargarNegocioPanel();
  await cargarCitasPanel();

  inputFiltro.addEventListener('change', cargarCitasPanel);
});

async function cargarNegocioPanel() {
  if (MODO_OFFLINE) {
    negocioActual = { id: NEGOCIO_DEFAULT_ID, nombre: 'Consultorio Dental Obregón (Modo Local)' };
  } else {
    const { data } = await supabaseClient.from('negocios').select('*').eq('slug', NEGOCIO_DEFAULT_SLUG).single();
    negocioActual = data;
  }
  document.getElementById('panel-titulo').textContent = `Panel: ${negocioActual.nombre}`;
}

async function cargarCitasPanel() {
  const fecha = document.getElementById('filtro-fecha').value;
  const container = document.getElementById('citas-container');
  container.innerHTML = '<p class="subtitle">Buscando citas...</p>';

  let citas = [];
  if (MODO_OFFLINE) {
    const guardadas = JSON.parse(localStorage.getItem('citas_locales') || '[]');
    citas = guardadas.filter(c => c.fecha_hora_inicio.startsWith(fecha));
  } else {
    const inicioDia = `${fecha}T00:00:00`;
    const finDia = `${fecha}T23:59:59`;
    const { data, error } = await supabaseClient
      .from('citas')
      .select('*, servicios(nombre)')
      .eq('negocio_id', negocioActual.id)
      .gte('fecha_hora_inicio', inicioDia)
      .lte('fecha_hora_inicio', finDia)
      .order('fecha_hora_inicio', { ascending: true });

    if (error) {
      container.innerHTML = `<p class="subtitle" style="color: var(--danger);">Error al cargar citas: ${error.message}</p>`;
      return;
    }
    citas = data || [];
  }

  if (citas.length === 0) {
    container.innerHTML = '<p class="subtitle">No hay citas registradas para este día.</p>';
    return;
  }

  container.innerHTML = citas.map(c => {
    const horaInicio = new Date(c.fecha_hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const servicioNombre = c.servicios?.nombre || 'Servicio General';
    
    return `
      <div class="cita-item">
        <div>
          <strong>${horaInicio} - ${c.cliente_nombre}</strong>
          <p class="subtitle" style="margin: 2px 0 0 0; font-size: 0.85rem;">${servicioNombre} | Tel: ${c.cliente_telefono}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge badge-${c.estado}">${c.estado}</span>
          <div class="cita-actions">
            ${c.estado !== 'confirmada' ? `<button onclick="cambiarEstado('${c.id}', 'confirmada')" style="color: var(--success);">Confirmar</button>` : ''}
            ${c.estado !== 'cancelada' ? `<button onclick="cambiarEstado('${c.id}', 'cancelada')" style="color: var(--danger);">Cancelar</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function cambiarEstado(citaId, nuevoEstado) {
  if (MODO_OFFLINE) {
    const guardadas = JSON.parse(localStorage.getItem('citas_locales') || '[]');
    const actualizadas = guardadas.map(c => c.id === citaId ? { ...c, estado: nuevoEstado } : c);
    localStorage.setItem('citas_locales', JSON.stringify(actualizadas));
  } else {
    const { error } = await supabaseClient.from('citas').update({ estado: nuevoEstado }).eq('id', citaId);
    if (error) return alert('Error al actualizar: ' + error.message);
  }
  await cargarCitasPanel();
}