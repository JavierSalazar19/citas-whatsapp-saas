/**
 * Convierte "HH:MM" a minutos desde las 00:00 (ej. "09:30" -> 570)
 */
function horaAMinutos(horaStr) {
  const [horas, minutos] = horaStr.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Convierte minutos desde las 00:00 a "HH:MM" (ej. 570 -> "09:30")
 */
function minutosAHora(totalMinutos) {
  const horas = Math.floor(totalMinutos / 60).toString().padStart(2, '0');
  const minutos = (totalMinutos % 60).toString().padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Genera los slots disponibles para una fecha específica.
 * @param {string} fechaISO - Fecha en formato "YYYY-MM-DD" (ej. "2026-11-18")
 * @param {Object} horarioSemanal - JSON de la tabla `negocios`
 * @param {number} duracionMinutos - Duración del servicio elegido (ej. 30)
 * @param {Array} citasDelDia - Lista de citas de ese día (excluyendo 'cancelada')
 * @returns {Array} Lista de objetos { hora: "09:00", disponible: true/false }
 */
function calcularHorariosDisponibles(fechaISO, horarioSemanal, duracionMinutos, citasDelDia) {
  // Obtener día de la semana (1 = Lunes ... 7 = Domingo)
  const fechaObj = new Date(`${fechaISO}T00:00:00`);
  let diaSemana = fechaObj.getDay(); 
  diaSemana = diaSemana === 0 ? 7 : diaSemana; // Ajustar domingo de 0 a 7

  const rangoLaboral = horarioSemanal[String(diaSemana)];
  
  // Si el negocio no abre ese día
  if (!rangoLaboral || rangoLaboral.length < 2) {
    return [];
  }

  const inicioJornada = horaAMinutos(rangoLaboral[0]);
  const finJornada = horaAMinutos(rangoLaboral[1]);
  const slots = [];

  // Convertir citas existentes a rangos de minutos locales
  const rangosOcupados = citasDelDia
    .filter(c => c.estado !== 'cancelada')
    .map(c => {
      const inicio = new Date(c.fecha_hora_inicio);
      const fin = new Date(c.fecha_hora_fin);
      return {
        inicioMin: inicio.getHours() * 60 + inicio.getMinutes(),
        finMin: fin.getHours() * 60 + fin.getMinutes()
      };
    });

  // Iterar en bloques de 30 minutos verificando que quepa la duración del servicio
  const paso = 30; 
  for (let actual = inicioJornada; actual + duracionMinutos <= finJornada; actual += paso) {
    const finPropuesto = actual + duracionMinutos;

    // Verificar si hay traslape: inicio_existente < fin_nuevo Y fin_existente > inicio_nuevo
    const estaOcupado = rangosOcupados.some(ocupado => 
      ocupado.inicioMin < finPropuesto && ocupado.finMin > actual
    );

    slots.push({
      hora: minutosAHora(actual),
      disponible: !estaOcupado
    });
  }

  return slots;
}