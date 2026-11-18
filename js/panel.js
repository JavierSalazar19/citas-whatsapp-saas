// ==========================================
// MÓDULO DE PANEL ADMINISTRATIVO MULTI-NEGOCIO
// ==========================================

const urlParamsPanel = new URLSearchParams(window.location.search);
const negocioSlugPanel = urlParamsPanel.get('negocio') || 'dental-obregon';

let negocioActual = null;

document.addEventListener('DOMContentLoaded', async () => {
  await cargarNegocioPanel();
  await cargarCitasPanel();
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
}

async function cargarCitasPanel() {
  if (!negocioActual) return;

  if (typeof MODO_OFFLINE !== 'undefined' && MODO_OFFLINE) {
    console.log('Modo offline: simulando citas del panel');
    return;
  }

  const { data, error } = await supabaseClient
    .from('citas')
    .select('*, servicios(nombre)')
    .eq('negocio_id', negocioActual.id)
    .order('fecha_hora', { ascending: true });

  if (error) {
    console.error('Error al cargar citas:', error);
    return;
  }

  const contenedorTabla = document.getElementById('lista-citas');
  if (!contenedorTabla) return;

  contenedorTabla.innerHTML = '';
  
  if (!data || data.length === 0) {
    contenedorTabla.innerHTML = '<tr><td colspan="5">No hay citas registradas para este negocio.</td></tr>';
    return;
  }

  data.forEach(cita => {
    const fila = document.createElement('tr');
    
    const fechaFormateada = new Date(cita.fecha_hora).toLocaleString();
    const servicioNombre = cita.servicios?.nombre || 'Servicio General';

    fila.innerHTML = `
      <td>${cita.cliente_nombre}</td>
      <td>${cita.cliente_telefono}</td>
      <td>${servicioNombre}</td>
      <td>${fechaFormateada}</td>
      <td><span class="badge ${cita.estado}">${cita.estado}</span></td>
    `;
    contenedorTabla.appendChild(fila);
  });
}