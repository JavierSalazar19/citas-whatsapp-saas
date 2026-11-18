// ==========================================
// MÓDULO DE ONBOARDING Y REGISTRO DE NEGOCIOS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const inputNombre = document.getElementById('negocio-nombre');
  const inputSlug = document.getElementById('negocio-slug');
  const previewUrl = document.getElementById('preview-url');
  const formRegistro = document.getElementById('form-registro');

  // Generar el slug automáticamente al escribir el nombre del negocio
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

  if (formRegistro) {
    formRegistro.addEventListener('submit', registrarNuevoNegocio);
  }
});

function generarSlug(texto) {
  return texto
    .toString()
    .normalize('NFD')                   // Separar acentos
    .replace(/[\u0300-\u036f]/g, '')    // Eliminar acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')       // Quitar caracteres especiales
    .replace(/\s+/g, '-')               // Cambiar espacios por guiones
    .replace(/-+/g, '-');               // Evitar guiones dobles
}

function actualizarPreviewUrl(slug) {
  const previewUrl = document.getElementById('preview-url');
  if (previewUrl) {
    const baseUrl = window.location.origin;
    previewUrl.textContent = `${baseUrl}/agendar.html?negocio=${slug || 'tu-negocio'}`;
  }
}

async function registrarNuevoNegocio(e) {
  e.preventDefault();

  const btnRegistrar = document.getElementById('btn-registrar');
  const nombreNegocio = document.getElementById('negocio-nombre').value.trim();
  const slugNegocio = generarSlug(document.getElementById('negocio-slug').value);
  const telefonoNegocio = document.getElementById('negocio-telefono').value.trim();
  
  const nombreServicio = document.getElementById('servicio-nombre').value.trim();
  const duracionServicio = parseInt(document.getElementById('servicio-duracion').value, 10);
  const precioServicio = parseFloat(document.getElementById('servicio-precio').value);

  if (!nombreNegocio || !slugNegocio || !telefonoNegocio || !nombreServicio) {
    alert('Por favor completa todos los campos.');
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

    // 2. Insertar el nuevo negocio en la tabla 'negocios'
    const { data: nuevoNegocio, error: errorNegocio } = await supabaseClient
      .from('negocios')
      .insert([{
        nombre: nombreNegocio,
        slug: slugNegocio,
        telefono_whatsapp: telefonoNegocio
      }])
      .select()
      .single();

    if (errorNegocio) throw errorNegocio;

    // 3. Crear el primer servicio asociado a este negocio
    const { error: errorServicio } = await supabaseClient
      .from('servicios')
      .insert([{
        negocio_id: nuevoNegocio.id,
        nombre: nombreServicio,
        duracion_minutos: duracionServicio,
        precio: precioServicio
      }]);

    if (errorServicio) throw errorServicio;

    // 4. Mostrar pantalla de éxito con ambos enlaces listos
    const baseUrl = window.location.origin;
    const urlAgendar = `${baseUrl}/agendar.html?negocio=${slugNegocio}`;
    const urlPanel = `${baseUrl}/panel.html?negocio=${slugNegocio}`;

    document.getElementById('form-registro').style.display = 'none';
    const boxResultado = document.getElementById('resultado-registro');
    
    const linkCliente = document.getElementById('link-cliente');
    linkCliente.href = urlAgendar;
    linkCliente.textContent = urlAgendar;

    const linkAdmin = document.getElementById('link-admin');
    linkAdmin.href = urlPanel;
    linkAdmin.textContent = urlPanel;

    boxResultado.style.display = 'block';

  } catch (err) {
    console.error('Error en el registro:', err);
    alert(`Ocurrió un error al registrar el negocio: ${err.message || 'Inténtalo de nuevo'}`);
    btnRegistrar.disabled = false;
    btnRegistrar.textContent = 'Crear mi Plataforma de Citas';
  }
}