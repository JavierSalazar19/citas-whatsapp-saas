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
  
  // Actualizar título y enlace público con el slug correcto
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

  // Consultar citas del negocio trayendo también el nombre del servicio relacionado
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

  // Filtrar por fecha si el usuario seleccionó una en el input
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
    card.className = 'cita-card'; // Estilo limpio para cada tarjeta
    card.style.cssText = 'border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 12px; background: #f8fafc;';

    const fechaInicio = new Date(cita.fecha_hora_inicio).toLocaleString();
    const servicioNombre = cita.servicios?.nombre || 'Servicio General';
    const estadoClase = cita.estado || 'pendiente';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="font-size: 1.1rem; color: #1e293b;">${cita.cliente_nombre}</strong>
        <span class="badge ${estadoClase}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; text-transform: uppercase; background: #e2e8f0;">${cita.estado}</span>
      </div>
      <p style="margin: 4px 0; color: #475569;">📞 <strong>Teléfono:</strong> ${cita.cliente_telefono}</p>
      <p style="margin: 4px 0; color: #475569;">✂️ <strong>Servicio:</strong> ${servicioNombre}</p>
      <p style="margin: 4px 0; color: #475569;">📅 <strong>Fecha y Hora:</strong> ${fechaInicio}</p>
    `;

    contenedor.appendChild(card);
  });
}