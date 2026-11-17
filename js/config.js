// Credenciales de Supabase
const SUPABASE_URL = 'https://sppptybmmbkwhjvhnyqp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iT18Y34vY7orWdetdfS77A_UGPSfILJ';

// Cambia a true si vas a programar sin internet en la tarde y quieres usar datos simulados
const MODO_OFFLINE = false;

// Inicializar cliente de Supabase
const supabaseClient = (!MODO_OFFLINE && window.supabase) 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// ID y slug de prueba del Consultorio Dental Obregón que insertaste en Supabase
const NEGOCIO_DEFAULT_SLUG = 'dental-obregon';
const NEGOCIO_DEFAULT_ID = '11111111-1111-1111-1111-111111111111';