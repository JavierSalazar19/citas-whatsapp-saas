// ==========================================
// MÓDULO DE PANEL ADMINISTRATIVO MULTI-NEGOCIO
// ==========================================

const urlParamsPanel = new URLSearchParams(window.location.search);
const negocioSlugPanel = urlParamsPanel.get('negocio') || 'dental-obregon';

let negocioActual = null;
let todasLasCitas = [];

document.addEventListener('DOMContentLoaded', async () => {
  await cargarNegocioPanel();
  
  const filtroFecha = document.getElementById('filtro-fecha');
  if (filtroFecha) {
    filtroFecha.addEventListener('change', renderizarCitas);
  }
});

async function cargarNegocioPanel() {
  if (typeof MODO_OFFLINE !== 'undefined' && MODO_OFFLINE) {
    negocioActual = { 
      id: '11111111-1111-1111-1111-111111111111', 
      nombre: 'Consultorio Dental Obregón (Modo Local)' 
    };
  } else {
    const { data, error } = await supabaseClient
      .from('negocios')
      .select('*')
      .eq('slug', negocioSlugPanel)
      .single();
    
    if (error || !data) {
      alert('Negocio no encontrado para el panel administrativo');
      return;
    }
    negocioActual = data;
  }
  
  const panelTitulo = document.getElementById('panel-titulo');
  if (panelTitulo) {
    panelTitulo.textContent = `Panel: ${negocioActual.nombre}`;
  }

  const linkPublico = document.querySelector('a.btn-primary');
  if (linkPublico) {
    linkPublico.href = `agendar.html?negocio=${negocioSlugPanel}`;
  }
  
  await cargarCitasPanel();
}

async function cargarCitasPanel() {
  if (!negocioActual) return;

  const contenedor = document.getElementById('citas-container');
  if (!contenedor) return;

  if (typeof MODO_OFFLINE !== 'undefined' && MODO_OFFLINE) {
    todasLasCitas = [];
    renderizarCitas();
    return;
  }

  const { data, error } = await supabaseClient
    .from('citas')
    .select('*, servicios(nombre)')
    .eq('negocio_id', negocioActual.id)
    .order('fecha_hora_inicio', { ascending: true });

  if (error) {
    console.error('Error al cargar citas:', error);
    contenedor.innerHTML = '<p class="subtitle" style="color: red;">Error al cargar las reservaciones.</p>';
    return;
  }

  todasLasCitas = data || [];
  renderizarCitas();
}

function renderizarCitas() {
  const contenedor = document.getElementById('citas-container');
  const filtroFechaInput = document.getElementById('filtro-fecha')?.value;
  
  if (!contenedor) return;

  let citasFiltradas = todasLasCitas;

  if (filtroFechaInput) {
    citasFiltradas = todasLasCitas.filter(cita => {
      if (!cita.fecha_hora_inicio) return false;
      const fechaCita = cita.fecha_hora_inicio.split('T')[0];
      return fechaCita === filtroFechaInput;
    });
  }

  if (citasFiltradas.length === 0) {
    contenedor.innerHTML = '<p class="subtitle">No hay citas registradas para esta fecha.</p>';
    return;
  }

  contenedor.innerHTML = '';

  citasFiltradas.forEach(cita => {
    const card = document.createElement('div');
    card.className = 'cita-card';
    card.style.cssText = 'border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 12px; background: #f8fafc;';

    const fechaInicio = new Date(cita.fecha_hora_inicio).toLocaleString();
    const servicioNombre = cita.servicios?.nombre || 'Servicio General';
    const estadoClase = cita.estado || 'pendiente';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="font-size: 1.1rem; color: #1e293b;">${cita.cliente_nombre}</strong>
        <span class="badge ${estadoClase}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; text-transform: uppercase; background: #cbd5e1; color: #334155;">${cita.estado}</span>
      </div>
      <p style="margin: 4px 0; color: #475569;">📞 <strong>Teléfono:</strong> ${cita.cliente_telefono}</p>
      <p style="margin: 4px 0; color: #475569;">✂️ <strong>Servicio:</strong> ${servicioNombre}</p>
      <p style="margin: 4px 0; color: #475569;">📅 <strong>Fecha y Hora:</strong> ${fechaInicio}</p>
      
      <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid #e2e8f0; pt-8px; padding-top: 10px;">
        <button onclick="actualizarEstado('${cita.id}', 'confirmada')" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Confirmar</button>
        <button onclick="actualizarEstado('${cita.id}', 'atendida')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Atendida</button>
        <button onclick="actualizarEstado('${cita.id}', 'cancelada')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Cancelar</button>
      </div>
    `;

    contenedor.appendChild(card);
  });
}

async function actualizarEstado(citaId, nuevoEstado) {
  const { error } = await supabaseClient
    .from('citas')
    .update({ estado: nuevoEstado })
    .eq('id', citaId);

  if (error) {
    console.error('Error al actualizar el estado:', error);
    alert('No se pudo actualizar el estado de la cita.');
  } else {
    // Recargar las citas en pantalla para reflejar el cambio al instante
    await cargarCitasPanel();
  }
}