-- Desactivar RLS temporalmente para pruebas rápidas desde el frontend
ALTER TABLE negocios DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicios DISABLE ROW LEVEL SECURITY;
ALTER TABLE citas DISABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_ia DISABLE ROW LEVEL SECURITY;

-- Insertar un consultorio piloto en Ciudad Obregón
INSERT INTO negocios (id, owner_user_id, nombre, slug, telefono_whatsapp, whatsapp_conectado, plan)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'Consultorio Dental Obregón',
    'dental-obregon',
    '5216441000000',
    true,
    'trial'
);

-- Insertar dos servicios para ese consultorio
INSERT INTO servicios (negocio_id, nombre, duracion_minutos, precio)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Valoración y Limpieza Dental', 45, 600.00),
    ('11111111-1111-1111-1111-111111111111', 'Consulta General / Urgencia', 30, 450.00);