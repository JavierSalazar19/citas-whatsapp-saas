let negocioActual = null;
let serviciosLista = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Leer ?negocio=slug de la URL o usar el de prueba
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('negocio') || NEGOCIO_DEFAULT_SLUG;

  // Fijar fecha mínima a hoy en hora local
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const inputFecha = document.getElementById('fecha');
  inputFecha.min = hoy;
  inputFecha.value = hoy;

  await cargarDatosNegocio(slug);
  await actualizarHorariosDisponibles();

  document.getElementById('servicio').addEventListener('change', actualizarHorariosDisponibles);
  inputFecha.addEventListener('change', actualizarHorariosDisponibles);
  document.getElementById('form-agendar').addEventListener('submit', guardarCita);
});

async function cargarDatosNegocio(slug) {
  if (MODO_OFFLINE) {
    negocioActual = {
      id: NEGOCIO_DEFAULT_ID,
      nombre: 'Consultorio Dental Obregón (Modo Local)',
      horario_semanal: {
        "1": ["09:00", "18:00"],
        "2": ["09:00", "18:00"],
        "3": ["09:00", "18:00"],
        "4": ["09:00", "18:00"],
        "5": ["09:00", "18:00"]
      }
    };
    serviciosLista = [
      { id: 's1', nombre: 'Valoración y Limpieza Dental', duracion_minutos: 45, precio: 600 },
      { id: 's2', nombre: 'Consulta General / Urgencia', duracion_minutos: 30, precio: 450 }
    ];
  } else {
    const { data: neg, error: errNeg } = await supabaseClient
      .from('negocios')
      .select('*')
      .eq('slug', slug)
      .single();

    if (errNeg || !neg) {
      document.getElementById('negocio-nombre').textContent = 'Negocio no encontrado';
      return;
    }

    negocioActual = neg;
    const { data: servs } = await supabaseClient
      .from('servicios')
      .select('*')
      .eq('negocio_id', neg.id)
      .eq('activo', true);

    serviciosLista = servs || [];
  }

  document.getElementById('negocio-nombre').textContent = negocioActual.nombre;
  const selectServicio = document.getElementById('servicio');
  selectServicio.innerHTML = serviciosLista.map(s => 
    `<option value="${s.id}" data-duracion="${s.duracion_minutos}">${s.nombre} (${s.duracion_minutos} min - $${s.precio})</option>`
  ).join('');
}

async function actualizarHorariosDisponibles() {
  if (!negocioActual) return;

  const fecha = document.getElementById('fecha').value;
  const selectServicio = document.getElementById('servicio');
  const duracion = Number(selectServicio.selectedOptions[0]?.dataset.duracion || 30);
  const container = document.getElementById('slots-container');
  document.getElementById('hora-seleccionada').value = '';

  let citasDelDia = [];
  if (MODO_OFFLINE) {
    const guardadas = JSON.parse(localStorage.getItem('citas_locales') || '[]');
    citasDelDia = guardadas.filter(c => c.fecha_hora_inicio.startsWith(fecha));
  } else {
    const inicioDia = new Date(`${fecha}T00:00:00`).toISOString();
    const finDia = new Date(`${fecha}T23:59:59`).toISOString();
    const { data } = await supabaseClient
      .from('citas')
      .select('fecha_hora_inicio, fecha_hora_fin, estado')
      .eq('negocio_id', negocioActual.id)
      .gte('fecha_hora_inicio', inicioDia)
      .lte('fecha_hora_inicio', finDia);
    citasDelDia = data || [];
  }

  const slots = calcularHorariosDisponibles(fecha, negocioActual.horario_semanal, duracion, citasDelDia);

  if (slots.length === 0) {
    container.innerHTML = '<p class="subtitle">No hay atención este día.</p>';
    return;
  }

  container.innerHTML = slots.map(s => `
    <button type="button" class="slot-btn" ${!s.disponible ? 'disabled' : ''} onclick="seleccionarHora(this, '${s.hora}')">
      ${s.hora}
    </button>
  `).join('');
}

function seleccionarHora(btn, hora) {
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('hora-seleccionada').value = hora;
}

async function guardarCita(e) {
  e.preventDefault();
  const hora = document.getElementById('hora-seleccionada').value;
  if (!hora) return alert('Por favor selecciona un horario disponible.');

  const btnSubmit = document.getElementById('btn-submit');
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Agendando...';

  const fecha = document.getElementById('fecha').value;
  const selectServicio = document.getElementById('servicio');
  const duracion = Number(selectServicio.selectedOptions[0].dataset.duracion);
  const nombre = document.getElementById('nombre').value.trim();
  const telLimpio = document.getElementById('telefono').value.replace(/\D/g, '');

  const inicio = new Date(`${fecha}T${hora}:00`);
  const fin = new Date(inicio.getTime() + duracion * 60000);

  const nuevaCita = {
    negocio_id: negocioActual.id,
    servicio_id: MODO_OFFLINE ? null : selectServicio.value,
    cliente_nombre: nombre,
    cliente_telefono: `521${telLimpio}`,
    fecha_hora_inicio: inicio.toISOString(),
    fecha_hora_fin: fin.toISOString(),
    estado: 'pendiente'
  };

  if (MODO_OFFLINE) {
    const guardadas = JSON.parse(localStorage.getItem('citas_locales') || '[]');
    guardadas.push({ ...nuevaCita, id: Date.now().toString() });
    localStorage.setItem('citas_locales', JSON.stringify(guardadas));
  } else {
    const { error } = await supabaseClient.from('citas').insert([nuevaCita]);
    if (error) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Confirmar Cita';
      return alert('Error al agendar: ' + error.message);
    }
  }

  btnSubmit.disabled = false;
  btnSubmit.textContent = 'Confirmar Cita';
  alert(`¡Listo ${nombre}! Tu cita quedó agendada para el ${fecha} a las ${hora}.`);
  e.target.reset();
  document.getElementById('fecha').value = fecha;
  await actualizarHorariosDisponibles();
}