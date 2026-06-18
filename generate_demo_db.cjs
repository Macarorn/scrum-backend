const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'scrum_db_schema_actualizado_Version4.sql');
const outPath = path.join(__dirname, 'demo_data_extended.sql');

let originalSql = fs.readFileSync(schemaPath, 'utf8');

// Find the start of data section
const dataMarker = '-- DATOS DE PRUEBA';
const schemaPartIndex = originalSql.indexOf(dataMarker);
let schemaPart = originalSql.substring(0, schemaPartIndex);

// Replace scrum_db with scrum_db_demo
schemaPart = schemaPart.replace(/scrum_db/g, 'scrum_db_demo');

const customData = `
-- ============================================================
-- DATOS DE PRUEBA (DEMO EXTENDIDO)
-- ============================================================

-- Permisos base
INSERT INTO permiso (nombre, descripcion) VALUES
('ver_backlog',         'Visualizar el backlog del producto'),
('editar_backlog',      'Crear y modificar épicas e historias'),
('gestionar_sprints',   'Crear, iniciar y cerrar sprints'),
('mover_tareas',        'Arrastrar tareas en el tablero'),
('gestionar_equipo',    'Agregar y asignar miembros al equipo'),
('ver_metricas',        'Ver burndown y métricas del sprint');

-- Roles
INSERT INTO rol (nombre_rol, descripcion) VALUES
('Product Owner',  'Define y prioriza el backlog'),
('Scrum Master',   'Facilita el proceso Scrum'),
('Developer',      'Desarrolla las tareas del sprint'),
('Designer',       'Diseña interfaces y experiencia de usuario'),
('Stakeholder',    'Interesado externo, solo lectura');

-- Permisos por rol
INSERT INTO rol_permiso VALUES
(1,1),(1,2),(1,3),(1,5),(1,6),  -- Product Owner
(2,1),(2,3),(2,4),(2,5),(2,6),  -- Scrum Master
(3,1),(3,4),                    -- Developer
(4,1),(4,4),                    -- Designer
(5,1),(5,6);                    -- Stakeholder

-- Usuarios (123456 es la contraseña encriptada)
-- $2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6 = 123456
INSERT INTO usuario (id_usuario, email, password, nombre, telefono, ciudad) VALUES
(1, 'po1@demo.com',     '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'Ana Product Owner',   '3000000001', 'Bogotá'),
(2, 'sm1@demo.com',     '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'Carlos Scrum Master', '3000000002', 'Medellín'),
(3, 'dev1@demo.com',    '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'David Developer 1',   '3000000003', 'Cali'),
(4, 'dev2@demo.com',    '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'Elena Developer 2',   '3000000004', 'Bogotá'),
(5, 'dev3@demo.com',    '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'Felipe Developer 3',  '3000000005', 'Barranquilla'),
(6, 'po2@demo.com',     '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'Gloria PO Ecommerce', '3000000006', 'Bogotá'),
(7, 'sm2@demo.com',     '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'Hugo SM Ecommerce',   '3000000007', 'Medellín'),
(8, 'po3@demo.com',     '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'Irene PO Banking',    '3000000008', 'Cali'),
(9, 'sm3@demo.com',     '$2a$10$.w6B0nM/2JfzqxpguOAr0Opw4D7Y0CPnr9fryEcYc4nVJNPhjUUR6', 'Jorge SM Banking',    '3000000009', 'Bogotá'),
(10, 'sofia@gmail.com', '$2a$10$QuHh1.Nl7qyyqVg5.y6R..Z8EEYkCYU/9YqkKCsGka0MlGScUqLHe', 'Sofia Product Owner', '3000000010', 'Bogotá'),
(11, 'mariana@gmail.com', '$2a$10$96N9jsvGIZlWxhinTZumJO9jl.5uudnJO01QmF3nZU8u.LTCFJ9BO', 'Mariana Scrum Master', '3000000011', 'Medellín'),
(12, 'jefferson@gmail.com', '$2a$10$RsqLxpNphe.5ldtzvA93BepI67bq4qU9Y0UuRSsXJVoUoaW.0lBaO', 'Jefferson Developer', '3000000012', 'Cali'),
(13, 'johan@gmail.com', '$2a$10$5i1oqepFjY5tdBXdNXSrbuR1ww7kNqtq4cU4EO6401XPpiM1eH9mi', 'Johan Developer', '3000000013', 'Bogotá');

-- Roles globales a usuarios
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES
(1, 1), (2, 2), (3, 3), (4, 3), (5, 3), (6, 1), (7, 2), (8, 1), (9, 2),
(10, 1), (11, 2), (12, 3), (13, 3);

-- Etiquetas del tablero
INSERT INTO etiqueta (nombre, color) VALUES
('Alta prioridad',  '#FF5733'),
('Bloqueada',       '#C0392B'),
('Bug',             '#E74C3C'),
('Mejora',          '#3498DB'),
('Revisión',        '#F39C12'),
('Testing',         '#27AE60'),
('Documentación',   '#9B59B6');

-- ============================================================
-- PROYECTO 1: Scrum Track Development (Estado: Activo)
-- ============================================================
INSERT INTO proyecto (id_proyecto, nombre, descripcion, tipo, estado, codigo_proyecto, team_size, creado_por) VALUES
(1, 'Scrum Track Development', 'Desarrollo de la plataforma principal de gestión ágil', 'Desarrollo de software', 'activo', 'SCRUMDEV', 9, 1);

INSERT INTO equipo_proyecto (id_equipo_proyecto, id_proyecto, nombre, descripcion) VALUES
(1, 1, 'Equipo ScrumTrack', 'Equipo de desarrollo principal');

INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES
(1, 1, 1), (2, 1, 2), (3, 1, 3), (4, 1, 3), (5, 1, 3),
(10, 1, 1), (11, 1, 2), (12, 1, 3), (13, 1, 3);

-- Epicas
INSERT INTO epica (id_epica, id_proyecto, nombre, descripcion, estado) VALUES
(1, 1, 'Gestión de Usuarios', 'Módulo de autenticación y perfiles', 'en_progreso'),
(2, 1, 'Gestión de Proyectos', 'Creación y configuración de proyectos', 'completada'),
(3, 1, 'Gestión de Sprints', 'Módulo para planear y ejecutar sprints', 'en_progreso');

-- Sprints
INSERT INTO sprint (id_sprint, id_proyecto, nombre, meta, fecha_inicio, fecha_fin, estado, velocidad_estimada) VALUES
(1, 1, 'Sprint 1 - Foundations', 'Tener la base de usuarios y proyectos', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'completado', 20),
(2, 1, 'Sprint 2 - Sprints & Kanban', 'Funcionalidad de sprints y tablero kanban', NOW(), DATE_ADD(NOW(), INTERVAL 13 DAY), 'en_curso', 25);

-- Historias de Usuario
INSERT INTO historia_usuario (id_historia, id_epica, id_sprint, nombre, prioridad, story_points, estado) VALUES
(1, 1, 1, 'Login de usuario', 1, 5, 'terminado'),
(2, 1, 1, 'Registro de usuario', 2, 3, 'terminado'),
(3, 2, 1, 'Crear proyecto nuevo', 1, 5, 'terminado'),
(4, 2, 1, 'Listar proyectos', 2, 2, 'terminado'),
(5, 3, 2, 'Crear Sprint', 1, 5, 'en_progreso'),
(6, 3, 2, 'Iniciar Sprint', 1, 3, 'en_progreso'),
(7, 3, 2, 'Tablero Kanban', 1, 8, 'por_hacer'),
(8, 1, 2, 'Recuperar contraseña', 3, 3, 'por_hacer');

-- Tareas
INSERT INTO tarea (id_tarea, id_historia, nombre, tipo, estado, story_points, orden_columna) VALUES
-- Sprint 1 (completadas)
(1, 1, 'UI de Login', 'RF', 'terminado', 2, 0),
(2, 1, 'Backend Login', 'RF', 'terminado', 3, 0),
(3, 2, 'UI Registro', 'RF', 'terminado', 2, 0),
(4, 2, 'Backend Registro', 'RF', 'terminado', 1, 0),
(5, 3, 'Formulario Proyecto', 'RF', 'terminado', 3, 0),
(6, 3, 'Endpoint POST Proyecto', 'RF', 'terminado', 2, 0),
(7, 4, 'Vista proyectos', 'RF', 'terminado', 2, 0),
-- Sprint 2 (en curso)
(8, 5, 'UI Crear Sprint', 'RF', 'en_progreso', 3, 1),
(9, 5, 'Backend Sprint', 'RF', 'terminado', 2, 3),
(10, 6, 'Botón iniciar sprint logic', 'RF', 'en_progreso', 3, 1),
(11, 7, 'Columnas Drag and Drop', 'RF', 'por_hacer', 5, 0),
(12, 7, 'Guardar estado de tareas', 'RF', 'por_hacer', 3, 0),
(13, 8, 'Vista forgot password', 'RF', 'por_hacer', 2, 0),
(14, 8, 'Envío de email', 'RF', 'por_hacer', 1, 0),
(15, 7, 'Filtros del tablero', 'mejora', 'por_hacer', 2, 0);

-- Asignación de tareas
INSERT INTO tarea_usuario (id_tarea, id_usuario, es_responsable) VALUES
(1, 3, 1), (2, 4, 1), (3, 5, 1), (4, 3, 1), (5, 4, 1), (6, 5, 1), (7, 3, 1),
(8, 4, 1), (9, 5, 1), (10, 3, 1), (11, 4, 1), (12, 5, 1), (13, 3, 1), (14, 4, 1);


-- ============================================================
-- PROYECTO 2: E-commerce Platform (Estado: Planeación)
-- ============================================================
INSERT INTO proyecto (id_proyecto, nombre, descripcion, tipo, estado, codigo_proyecto, team_size, creado_por) VALUES
(2, 'E-commerce Platform', 'Nueva plataforma de ventas online', 'E-commerce', 'inicio', 'ECOMMERCE', 4, 6);

INSERT INTO equipo_proyecto (id_equipo_proyecto, id_proyecto, nombre, descripcion) VALUES
(2, 2, 'Equipo E-commerce', 'Equipo inicial');

INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES
(6, 2, 1), (7, 2, 2), (3, 2, 3), (4, 2, 3);

-- Epicas
INSERT INTO epica (id_epica, id_proyecto, nombre, descripcion, estado) VALUES
(4, 2, 'Catálogo de Productos', 'Muestra de productos e inventario', 'por_hacer'),
(5, 2, 'Carrito de Compras', 'Lógica de checkout y pagos', 'por_hacer');

-- Sprints
INSERT INTO sprint (id_sprint, id_proyecto, nombre, meta, fecha_inicio, fecha_fin, estado, velocidad_estimada) VALUES
(3, 2, 'Sprint 1 - Catálogo Base', 'Visualización de productos', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 15 DAY), 'planeado', 20);

-- Historias de Usuario
INSERT INTO historia_usuario (id_historia, id_epica, id_sprint, nombre, prioridad, story_points, estado) VALUES
(9, 4, 3, 'Listado de productos', 1, 5, 'por_hacer'),
(10, 4, 3, 'Detalle de producto', 2, 3, 'por_hacer'),
(11, 4, 3, 'Búsqueda', 2, 3, 'por_hacer'),
(12, 5, NULL, 'Agregar a carrito', 1, 5, 'por_hacer'),
(13, 5, NULL, 'Pasarela de pagos', 1, 8, 'por_hacer');

-- Tareas (todas por hacer)
INSERT INTO tarea (id_tarea, id_historia, nombre, tipo, estado, story_points, orden_columna) VALUES
(16, 9, 'Base de datos productos', 'RF', 'por_hacer', 3, 0),
(17, 9, 'API Productos', 'RF', 'por_hacer', 2, 0),
(18, 10, 'UI Detalle producto', 'RF', 'por_hacer', 2, 0),
(19, 10, 'Fotos de producto', 'RF', 'por_hacer', 1, 0),
(20, 11, 'Barra de búsqueda UI', 'RF', 'por_hacer', 1, 0),
(21, 11, 'Full-text search logic', 'RF', 'por_hacer', 2, 0),
(22, 12, 'State management carrito', 'RF', 'por_hacer', 3, 0),
(23, 12, 'Checkout UI', 'RF', 'por_hacer', 2, 0);

INSERT INTO tarea_usuario (id_tarea, id_usuario, es_responsable) VALUES
(16, 3, 1), (17, 4, 1), (18, 3, 1), (19, 4, 1);


-- ============================================================
-- PROYECTO 3: Mobile Banking App (Estado: Cerrado)
-- ============================================================
INSERT INTO proyecto (id_proyecto, nombre, descripcion, tipo, estado, codigo_proyecto, team_size, creado_por) VALUES
(3, 'Mobile Banking App', 'Aplicación bancaria finalizada', 'Móvil', 'completado', 'BANKING', 3, 8);

INSERT INTO equipo_proyecto (id_equipo_proyecto, id_proyecto, nombre, descripcion) VALUES
(3, 3, 'Equipo Bank', 'Equipo finalizado');

INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES
(8, 3, 1), (9, 3, 2), (5, 3, 3);

-- Epicas
INSERT INTO epica (id_epica, id_proyecto, nombre, descripcion, estado) VALUES
(6, 3, 'Autenticación Biométrica', 'Acceso seguro', 'completada'),
(7, 3, 'Transacciones', 'Transferencias', 'completada');

-- Sprints
INSERT INTO sprint (id_sprint, id_proyecto, nombre, meta, fecha_inicio, fecha_fin, estado, velocidad_estimada, velocidad_real) VALUES
(4, 3, 'Sprint 1 - Auth', 'Lograr autenticación biométrica', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY), 'completado', 15, 15),
(5, 3, 'Sprint 2 - Transferencias', 'Lograr transferencias entre cuentas', DATE_SUB(NOW(), INTERVAL 29 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY), 'completado', 20, 20);

-- Historias de Usuario
INSERT INTO historia_usuario (id_historia, id_epica, id_sprint, nombre, prioridad, story_points, estado) VALUES
(14, 6, 4, 'Login FaceID', 1, 5, 'terminado'),
(15, 6, 4, 'Login Huella', 2, 5, 'terminado'),
(16, 6, 4, 'Recuperar clave OTP', 1, 3, 'terminado'),
(17, 7, 5, 'Transferir misma entidad', 1, 5, 'terminado'),
(18, 7, 5, 'Transferir otros bancos', 1, 5, 'terminado'),
(19, 7, 5, 'Historial', 2, 3, 'terminado');

-- Tareas
INSERT INTO tarea (id_tarea, id_historia, nombre, tipo, estado, story_points, orden_columna) VALUES
(24, 14, 'SDK FaceID', 'RF', 'terminado', 3, 0),
(25, 14, 'Backend Auth FaceID', 'RF', 'terminado', 2, 0),
(26, 15, 'SDK Fingerprint', 'RF', 'terminado', 3, 0),
(27, 15, 'Backend Auth Fingerprint', 'RF', 'terminado', 2, 0),
(28, 16, 'Generador OTP', 'RF', 'terminado', 2, 0),
(29, 16, 'Envío SMS', 'RF', 'terminado', 1, 0),
(30, 17, 'Formulario transferencia', 'RF', 'terminado', 2, 0),
(31, 17, 'Core bancario API interna', 'RF', 'terminado', 3, 0),
(32, 18, 'ACH API Integration', 'RF', 'terminado', 3, 0),
(33, 18, 'Formulario ACH', 'RF', 'terminado', 2, 0),
(34, 19, 'Vista historial', 'RF', 'terminado', 2, 0),
(35, 19, 'Endpoint Historial', 'RF', 'terminado', 1, 0);

INSERT INTO tarea_usuario (id_tarea, id_usuario, es_responsable) VALUES
(24, 5, 1), (25, 5, 1), (26, 5, 1), (27, 5, 1), (28, 5, 1), (29, 5, 1),
(30, 5, 1), (31, 5, 1), (32, 5, 1), (33, 5, 1), (34, 5, 1), (35, 5, 1);


-- ============================================================
-- REUNIONES
-- ============================================================
INSERT INTO meeting (title, description, sprint, status, date, type, startTime, duration, room, link) VALUES
('Sprint Planning 2', 'Planificación del Sprint 2', '2', 'programada', DATE_ADD(NOW(), INTERVAL 1 DAY), 'planning', '09:00', '120', 'Sala A', 'https://meet.google.com/abc-defg-hij'),
('Daily Standup', 'Reunión diaria de sincronización', '2', 'programada', DATE_ADD(NOW(), INTERVAL 2 DAY), 'daily', '09:00', '15', 'Sala B', 'https://meet.google.com/xyz-uvw-rst'),
('Sprint Review', 'Revisión de lo avanzado en Sprint 2', '2', 'programada', DATE_ADD(NOW(), INTERVAL 13 DAY), 'review', '15:00', '60', 'Sala Principal', 'https://meet.google.com/123-456-789'),
('Retrospectiva Sprint 1', 'Retrospectiva del Sprint 1', '1', 'completada', DATE_SUB(NOW(), INTERVAL 1 DAY), 'retro', '16:00', '60', 'Sala C', 'https://meet.google.com/qwe-asd-zxc'),
('Refinamiento de Backlog', 'Refinar historias para Sprint 3', '2', 'programada', DATE_ADD(NOW(), INTERVAL 5 DAY), 'refinement', '14:00', '60', 'Sala D', 'https://meet.google.com/rty-fgh-vbn');

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje) VALUES
(3, 'informativa', 'Nueva Tarea Asignada', 'Se te ha asignado la tarea: UI Crear Sprint en el proyecto Scrum Track Development.'),
(4, 'informativa', 'Nueva Tarea Asignada', 'Se te ha asignado la tarea: Columnas Drag and Drop en el proyecto Scrum Track Development.'),
(1, 'informativa', 'Estado cambiado', 'La historia Login de usuario ha sido terminada.'),
(6, 'urgente', 'Planeación de Sprint', 'Recuerda que debes iniciar el Sprint 1 de E-commerce.'),
(8, 'informativa', 'Proyecto Completado', 'El proyecto Mobile Banking App ha finalizado con éxito.');

`;

fs.writeFileSync(outPath, schemaPart + customData);
console.log('Script demo_data_extended.sql generado exitosamente en ' + outPath);
