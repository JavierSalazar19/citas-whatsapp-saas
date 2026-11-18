// ==========================================
// MÓDULO DE AGENDAMIENTO MULTI-NEGOCIO
// ==========================================

// Detectar el negocio actual mediante el parámetro ?negocio=slug en la URL
const urlParams = new URLSearchParams(window.location.search);
const negocioSlug = urlParams.get('negocio') || 'dental-obregon'; // Valor por defecto si no viene en la URL

let negocioActual = null;
let serviciosDisponibles = [];

document.addEventListener('DOMContentLoaded', async () => {
  await cargarNegocio();
  
  const fechaInput = document.getElementById('fecha');
  if (fechaInput) {
    // Establecer fecha mínima como hoy
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.min = hoy;
    fechaInput.addEventListener('change', cargarHorarios);
  }

  const formAgendar = document.getElementById('form-agendar');
  if (formAgendar) {
    formAgendar.addEventListener('submit', manejarAgendamiento);
  }
});

async function cargarNegocio() {
  if (typeof MODO_OFFLINE !== 'undefined' && MODO_OFFLINE) {
    negocioActual = { 
      id: '11111111-1111-1111-1111-111111111111', 
      nombre: 'Consultorio Dental Obregón (Modo Local)' 
    };
  } else {
    // Consultar el negocio en Supabase usando el slug de la URL
    const { data, error } = await supabaseClient
      .from('negocios')
      .select('*')
      .eq('slug', negocioSlug)
      .single();
    
    if (error || !data) {
      alert('Negocio no encontrado en la plataforma');
      return;
    }
    negocioActual = data;
  }
  
  // Actualizar el título en pantalla con el nombre dinámico del negocio
  const tituloNegocio = document.getElementById('negocio-nombre');
  if (tituloNegocio) {
    tituloNegocio.textContent = negocioActual.nombre;
  }
  
  await cargarServicios();
}

async function cargarServicios() {
  if (!negocioActual) return;

  if (typeof MODO_OFFLINE !== 'undefined' && MODO_OFFLINE) {
    serviciosDisponibles = [
      { id: 'srv-1', nombre: 'Limpieza Dental', duracion_minutos: 30 },
      { id: 'srv-2', nombre: 'Consulta General', duracion_minutos: 45 }
    ];
  } else {
    const { data, error } = await supabaseClient
      .from('servicios')
      .select('*')
      .eq('negocio_id', negocioActual.id);

    if (error) {
      console.error('Error al cargar servicios:', error);
      return;
    }
    serviciosDisponibles = data || [];
  }

  const selectServicio = document.getElementById('servicio');
  if (selectServicio) {
    selectServicio.innerHTML = '<option value="">Selecciona un servicio...</option>';
    serviciosDisponibles.forEach(s => {
      const option = document.createElement('option');
      option.value = s.id;
      option.textContent = `${s.nombre} (${s.duracion_minutos} min)`;
      selectServicio.appendChild(option);
    });
  }
}

async function cargarHorarios() {
  const fechaSeleccionada = document.getElementById('fecha').value;
  const slotsContainer = document.getElementById('slots-container');
  
  if (!fechaSeleccionada || !slotsContainer) return;

  slotsContainer.innerHTML = '<p class="subtitle">Cargando horarios...</p>';

  // Bloques de horario de ejemplo
  const horariosEjemplo = ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];
  
  slotsContainer.innerHTML = '';
  horariosEjemplo.forEach(h => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = h;
    btn.addEventListener('click', () => {
      // Remover selección previa
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
      // Seleccionar este botón
      btn.classList.add('selected');
      // Guardar en el input oculto
      document.getElementById('hora-seleccionada').value = h;
    });
    slotsContainer.appendChild(btn);
  });
}

async function manejarAgendamiento(e) {
  e.preventDefault();
  
  const clienteNombre = document.getElementById('nombre')?.value;
  const clienteTelefono = document.getElementById('telefono')?.value;
  const servicioId = document.getElementById('servicio')?.value;
  const fecha = document.getElementById('fecha')?.value;
  const hora = document.getElementById('hora-seleccionada')?.value;

  if (!clienteNombre || !clienteTelefono || !servicioId || !fecha || !hora) {
    alert('Por favor completa todos los campos y selecciona un horario.');
    return;
  }

  const nuevaCita = {
    negocio_id: negocioActual.id,
    servicio_id: servicioId,
    cliente_nombre: clienteNombre,
    cliente_telefono: clienteTelefono,
    fecha_hora: `${fecha}T${hora}:00`,
    estado: 'pendiente'
  };

  if (typeof MODO_OFFLINE !== 'undefined' && MODO_OFFLINE) {
    alert('Cita agendada con éxito (Modo Local)');
    return;
  }

  const { error } = await supabaseClient
    .from('citas')
    .insert([nuevaCita]);

  if (error) {
    console.error('Error al guardar la cita:', error);
    alert('Hubo un error al agendar tu cita. Inténtalo de nuevo.');
  } else {
    alert('¡Cita agendada con éxito! Te enviaremos confirmación.');
    document.getElementById('form-agendar').reset();
    document.getElementById('slots-container').innerHTML = '<p class="subtitle">Selecciona una fecha para ver horarios.</p>';
  }
}