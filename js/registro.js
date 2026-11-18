// ==========================================
// MÓDULO DE ONBOARDING Y REGISTRO DE NEGOCIOS (MÚLTIPLES SERVICIOS)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const inputNombre = document.getElementById('negocio-nombre');
  const inputSlug = document.getElementById('negocio-slug');
  const formRegistro = document.getElementById('form-registro');
  const btnAgregarServicio = document.getElementById('btn-agregar-servicio');

  if (inputNombre && inputSlug) {
    inputNombre.addEventListener('input', () => {
      const slugGenerado = generarSlug(inputNombre.value);
      inputSlug.value = slugGenerado;
      actualizarPreviewUrl(slugGenerado);
    });

    inputSlug.addEventListener('input', () => {
      const slugLimpio = generarSlug(inputSlug.value);
      inputSlug.value = slugLimpio;
      actualizarPreviewUrl(slugLimpio);
    });
  }

  if (btnAgregarServicio) {
    btnAgregarServicio.addEventListener('click', agregarFilaServicio);
  }

  if (formRegistro) {
    formRegistro.addEventListener('submit', registrarNuevoNegocio);
  }
});

function generarSlug(texto) {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function actualizarPreviewUrl(slug) {
  const previewUrl = document.getElementById('preview-url');
  if (previewUrl) {
    const baseUrl = window.location.origin;
    previewUrl.textContent = `${baseUrl}/agendar.html?negocio=${slug || 'tu-negocio'}`;
  }
}

function agregarFilaServicio() {
  const contenedor = document.getElementById('servicios-container');
  const item = document.createElement('div');
  item.className = 'servicio-item';
  item.style.cssText = 'background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 10px; position: relative;';

  item.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <label style="font-size: 0.85rem; font-weight: bold; color: #475569;">Nuevo Servicio</label>
      <button type="button" onclick="this.parentElement.parentElement.remove()" style="background: #ef4444; color: white; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Eliminar</button>
    </div>
    <div class="form-group" style="margin-bottom: 8px;">
      <label style="font-size: 0.85rem;">Nombre del servicio</label>
      <input type="text" class="serv-nombre" placeholder="Ej. Corte y Barba" required />
    </div>
    <div style="display: flex; gap: 10px;">
      <div class="form-group" style="flex: 1; margin-bottom: 0;">
        <label style="font-size: 0.85rem;">Duración (min)</label>
        <input type="number" class="serv-duracion" value="30" min="5" step="5" required />
      </div>
      <div class="form-group" style="flex: 1; margin-bottom: 0;">
        <label style="font-size: 0.85rem;">Precio ($ MXN)</label>
        <input type="number" class="serv-precio" value="200" min="0" required />
      </div>
    </div>
  `;

  contenedor.appendChild(item);
}

async function registrarNuevoNegocio(e) {
  e.preventDefault();

  const btnRegistrar = document.getElementById('btn-registrar');
  const nombreNegocio = document.getElementById('negocio-nombre').value.trim();
  const slugNegocio = generarSlug(document.getElementById('negocio-slug').value);
  const telefonoNegocio = document.getElementById('negocio-telefono').value.trim();

  // Recolectar todos los servicios del formulario
  const servicioItems = document.querySelectorAll('.servicio-item');
  const serviciosArray = [];

  servicioItems.forEach(item => {
    const nombre = item.querySelector('.serv-nombre').value.trim();
    const duracion = parseInt(item.querySelector('.serv-duracion').value, 10);
    const precio = parseFloat(item.querySelector('.serv-precio').value);

    if (nombre) {
      serviciosArray.push({
        nombre,
        duracion_minutos: duracion,
        precio
      });
    }
  });

  if (!nombreNegocio || !slugNegocio || !telefonoNegocio || serviciosArray.length === 0) {
    alert('Por favor completa todos los campos y añade al menos un servicio.');
    return;
  }

  btnRegistrar.disabled = true;
  btnRegistrar.textContent = 'Creando plataforma...';

  try {
    // 1. Verificar si el slug ya está ocupado
    const { data: existente } = await supabaseClient
      .from('negocios')
      .select('id')
      .eq('slug', slugNegocio)
      .maybeSingle();

    if (existente) {
      alert('Este enlace personalizado (slug) ya está en uso por otro negocio. Por favor elige uno distinto.');
      btnRegistrar.disabled = false;
      btnRegistrar.textContent = 'Crear mi Plataforma de Citas';
      return;
    }

    // 2. Insertar el nuevo negocio
    const { data: nuevoNegocio, error: errorNegocio } = await supabaseClient
      .from('negocios')
      .insert([{
        nombre: nombreNegocio,
        slug: slugNegocio,
        telefono_whatsapp: telefonoNegocio,
        owner_user_id: '00000000-0000-0000-0000-000000000000'
      }])
      .select()
      .single();

    if (errorNegocio) throw errorNegocio;

    // 3. Preparar e insertar todos los servicios en lote asignando el negocio_id
    const serviciosAInsertar = serviciosArray.map(s => ({
      negocio_id: nuevoNegocio.id,
      nombre: s.nombre,
      duracion_minutos: s.duracion_minutos,
      precio: s.precio
    }));

    const { error: errorServicios } = await supabaseClient
      .from('servicios')
      .insert(serviciosAInsertar);

    if (errorServicios) throw errorServicios;

    // 4. Mostrar pantalla de éxito
    const baseUrl = window.location.origin;
    const urlAgendar = `${baseUrl}/agendar.html?negocio=${slugNegocio}`;
    const urlPanel = `${baseUrl}/panel.html?negocio=${slugNegocio}`;

    document.getElementById('form-registro').style.display = 'none';
    const boxResultado = document.getElementById('resultado-registro');
    
    document.getElementById('link-cliente').href = urlAgendar;
    document.getElementById('link-cliente').textContent = urlAgendar;

    document.getElementById('link-admin').href = urlPanel;
    document.getElementById('link-admin').textContent = urlPanel;

    boxResultado.style.display = 'block';

  } catch (err) {
    console.error('Error en el registro:', err);
    alert(`Ocurrió un error al registrar el negocio: ${err.message || 'Inténtalo de nuevo'}`);
    btnRegistrar.disabled = false;
    btnRegistrar.textContent = 'Crear mi Plataforma de Citas';
  }
}