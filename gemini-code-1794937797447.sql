-- Habilitar extensión para generar UUIDs únicos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE NEGOCIOS (Tenants / Tus clientes)
CREATE TABLE negocios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL, -- Enlaza con auth.users de Supabase
    nombre VARCHAR(120) NOT NULL,
    slug VARCHAR(80) UNIQUE NOT NULL, -- Ej: 'clinica-dental-obregon' (para el link público)
    telefono_whatsapp VARCHAR(20) NOT NULL, -- Número conectado a la API de WhatsApp
    whatsapp_instance_id VARCHAR(100), -- ID de sesión en Evolution API / Cloud API
    whatsapp_conectado BOOLEAN DEFAULT FALSE,
    
    -- Horario laboral en JSON para máxima flexibilidad por día
    -- Ejemplo: {"1": ["09:00", "18:00"], "2": ["09:00", "18:00"], "6": ["09:00", "14:00"]} (1=Lunes, 7=Domingo)
    horario_semanal JSONB NOT NULL DEFAULT '{
        "1": ["09:00", "18:00"],
        "2": ["09:00", "18:00"],
        "3": ["09:00", "18:00"],
        "4": ["09:00", "18:00"],
        "5": ["09:00", "18:00"]
    }'::jsonb,
    
    -- Configuración de recordatorios
    recordatorio_1_horas INT DEFAULT 24, -- Primer aviso (ej. 24 hrs antes)
    recordatorio_2_horas INT DEFAULT 2,  -- Segundo aviso (ej. 2 hrs antes)
    
    -- Suscripción SaaS
    plan VARCHAR(30) DEFAULT 'trial', -- 'trial', 'esencial', 'clinica', 'suspendido'
    trial_termina_en TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE SERVICIOS POR NEGOCIO
CREATE TABLE servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL, -- Ej: 'Consulta General', 'Limpieza Dental'
    duracion_minutos INT NOT NULL DEFAULT 30, -- Clave para calcular disponibilidad
    precio DECIMAL(10, 2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE CITAS (Núcleo operativo)
CREATE TABLE citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    servicio_id UUID REFERENCES servicios(id) ON DELETE SET NULL,
    
    -- Datos del paciente/cliente
    cliente_nombre VARCHAR(120) NOT NULL,
    cliente_telefono VARCHAR(20) NOT NULL, -- Formato internacional sin '+', ej: 5216441234567
    notas TEXT,
    
    -- Tiempo exacto de la cita
    fecha_hora_inicio TIMESTAMPTZ NOT NULL,
    fecha_hora_fin TIMESTAMPTZ NOT NULL,
    
    -- Estado de la cita
    -- 'pendiente': Agendada pero no confirmada
    -- 'confirmada': El cliente confirmó por WhatsApp
    -- 'reagendada': Cambiada de horario
    -- 'cancelada': Cancelada por el cliente o negocio
    -- 'completada': Asistió
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    
    -- Control de automatización (evita mandar mensajes repetidos en cada ciclo del Cron)
    recordatorio_1_enviado BOOLEAN DEFAULT FALSE,
    recordatorio_2_enviado BOOLEAN DEFAULT FALSE,
    notificacion_inicial_enviada BOOLEAN DEFAULT FALSE,
    
    -- Sincronización opcional con Google Calendar
    google_event_id VARCHAR(255),
    
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE HISTORIAL DE MENSAJES (Contexto para la IA)
CREATE TABLE mensajes_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    cita_id UUID REFERENCES citas(id) ON DELETE SET NULL,
    cliente_telefono VARCHAR(20) NOT NULL,
    rol VARCHAR(15) NOT NULL, -- 'user' (paciente), 'assistant' (IA), 'system'
    contenido TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES PARA RENDIMIENTO (Cruciales para el Cron Job y búsqueda de huecos)
CREATE INDEX idx_citas_negocio_fecha ON citas(negocio_id, fecha_hora_inicio);
CREATE INDEX idx_citas_pendientes_recordatorio ON citas(estado, fecha_hora_inicio) 
    WHERE estado IN ('pendiente', 'confirmada');
CREATE INDEX idx_mensajes_telefono ON mensajes_ia(negocio_id, cliente_telefono, creado_en DESC);