-- ============================================================
-- BASE DE DATOS: scrum_db_demo
-- Proyecto: Sistema de Gestión de Proyectos con Scrum
-- Alcance: Módulos 1 al 4
--   1. Gestión de Roles y Usuarios
--   2. Backlog de Producto
--   3. Sprints
--   4. Tablón de Tareas (Kanban / Scrum Board)
-- Versión: 2.1 (optimizada con índices y mejoras)
-- ============================================================

DROP DATABASE IF EXISTS scrum_db_demo;

CREATE DATABASE scrum_db_demo
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE scrum_db_demo;

-- ============================================================
-- MÓDULO 1 — GESTIÓN DE ROLES Y USUARIOS
-- ============================================================

-- Tabla de permisos funcionales del sistema
CREATE TABLE permiso (
    id_permiso      INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     VARCHAR(255),
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Roles del sistema (Product Owner, Scrum Master, Developer, etc.)
-- Definimos aquí id_proyecto y la clave única en el momento de creación de la tabla,
-- en lugar de hacerlo después con ALTER TABLE al final del script.
CREATE TABLE rol (
    id_rol          INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol      VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    id_proyecto     INT NULL,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_rol_nombre_proyecto (id_proyecto, nombre_rol)
);

-- Relación rol → permisos (qué puede hacer cada rol)
CREATE TABLE rol_permiso (
    id_rol          INT NOT NULL,
    id_permiso      INT NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    FOREIGN KEY (id_rol)     REFERENCES rol(id_rol) ON DELETE CASCADE,
    FOREIGN KEY (id_permiso) REFERENCES permiso(id_permiso) ON DELETE CASCADE
);

-- Usuarios de la plataforma
CREATE TABLE usuario (
    id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(200) NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    telefono        VARCHAR(20),
    ciudad          VARCHAR(100),
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    is_verified     TINYINT(1) NOT NULL DEFAULT 1,
    consent_granted TINYINT(1) NOT NULL DEFAULT 1,
    consent_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    consent_version VARCHAR(50) DEFAULT 'v1.0',
    fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Índices en usuario
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_activo ON usuario(activo);

-- Relación usuario ↔ rol (con fecha de asignación)
CREATE TABLE usuario_rol (
    id_usuario          INT NOT NULL,
    id_rol              INT NOT NULL,
    fecha_asignacion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_rol),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_rol)     REFERENCES rol(id_rol) ON DELETE CASCADE
);

-- Habilidades técnicas o de rol
CREATE TABLE habilidad (
    id_habilidad    INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    categoria       VARCHAR(100),
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Relación usuario ↔ habilidad
CREATE TABLE usuario_habilidad (
    id_usuario      INT NOT NULL,
    id_habilidad    INT NOT NULL,
    nivel           VARCHAR(50),
    PRIMARY KEY (id_usuario, id_habilidad),
    FOREIGN KEY (id_usuario)   REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_habilidad) REFERENCES habilidad(id_habilidad) ON DELETE CASCADE
);

-- Perfil público del usuario
CREATE TABLE perfil_usuario (
    id_perfil               INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario              INT NOT NULL UNIQUE,
    descripcion_personal    TEXT,
    experiencia             TEXT,
    portafolio_url          VARCHAR(255),
    foto_perfil_url         VARCHAR(255),
    visibilidad             ENUM('publico', 'privado', 'solo_equipo') NOT NULL DEFAULT 'publico',
    fecha_creacion          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion     DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- ============================================================
-- MÓDULO 2 — BACKLOG DE PRODUCTO
-- ============================================================

-- Proyectos
CREATE TABLE proyecto (
    id_proyecto     INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    tipo            VARCHAR(100),
    estado          ENUM('inicio','activo','pausado','completado','cancelado') NOT NULL DEFAULT 'activo',
    fecha_inicio    DATE,
    fecha_fin_est   DATE,
    codigo_proyecto VARCHAR(10) NOT NULL UNIQUE,
    team_size       INT NOT NULL DEFAULT 1,
    creado_por      INT NOT NULL,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

-- Tabla para manejar solicitudes de ingreso a proyectos
CREATE TABLE solicitud (
    id_solicitud      INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto       INT NOT NULL,
    id_usuario        INT NOT NULL,
    id_usuario_creador INT DEFAULT NULL,
    mensaje_opcional  TEXT,
    estado            ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Cancelada') DEFAULT 'Pendiente',
    motivo            TEXT,
    id_rol            INT DEFAULT NULL,
    fecha_creacion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_creador) REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol) ON DELETE SET NULL
);

-- Notificaciones del sistema
CREATE TABLE notificacion (
    id_notificacion     INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario          INT NOT NULL,
    tipo                ENUM('sistema','urgente','prioritaria','mensajeria','informativa','recordatorio','reunion_creada','reunion_actualizada','reunion_eliminada','tarea_asignada','tarea_desasignada','tarea_reasignada','tarea_actualizada') NOT NULL DEFAULT 'informativa',
    titulo              VARCHAR(200) NOT NULL,
    mensaje             TEXT,
    leida               TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_solicitud        INT DEFAULT NULL,
    id_meeting          INT DEFAULT NULL,
    id_proyecto         INT DEFAULT NULL,
    accion              VARCHAR(50) DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE
);

-- Índices en notificación
CREATE INDEX idx_notificacion_usuario ON notificacion(id_usuario);
CREATE INDEX idx_notificacion_leida ON notificacion(leida);
CREATE INDEX idx_notificacion_meeting ON notificacion(id_meeting);
CREATE INDEX idx_notificacion_proyecto ON notificacion(id_proyecto);

-- Índices en proyecto
CREATE INDEX idx_proyecto_estado ON proyecto(estado);
CREATE INDEX idx_proyecto_creado_por ON proyecto(creado_por);
CREATE INDEX idx_proyecto_codigo ON proyecto(codigo_proyecto);

-- Equipo de trabajo ligado a un proyecto
CREATE TABLE equipo_proyecto (
    id_equipo_proyecto  INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto         INT NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    descripcion         TEXT,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE
);

-- Integrantes del equipo de proyecto
CREATE TABLE usuario_equipo_proyecto (
    id_usuario              INT NOT NULL,
    id_equipo_proyecto      INT NOT NULL,
    id_rol                  INT NOT NULL,
    fecha_ingreso           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo                  TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_usuario, id_equipo_proyecto),
    FOREIGN KEY (id_usuario)          REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_equipo_proyecto)  REFERENCES equipo_proyecto(id_equipo_proyecto) ON DELETE CASCADE,
    FOREIGN KEY (id_rol)              REFERENCES rol(id_rol) ON DELETE RESTRICT
);

-- Etiquetas reutilizables
CREATE TABLE etiqueta (
    id_etiqueta     INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    color           VARCHAR(20),
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Épicas del backlog
CREATE TABLE epica (
    id_epica        INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto     INT NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    categoria       VARCHAR(100),
    prioridad       TINYINT NOT NULL DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),
    estado          ENUM('por_hacer','en_progreso','completada','cancelada') NOT NULL DEFAULT 'por_hacer',
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE
);

-- Índices en epica
CREATE INDEX idx_epica_proyecto ON epica(id_proyecto);
CREATE INDEX idx_epica_estado ON epica(estado);

-- Historias de usuario
CREATE TABLE historia_usuario (
    id_historia         INT AUTO_INCREMENT PRIMARY KEY,
    id_epica            INT NOT NULL,
    id_sprint           INT,
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    como_quien          VARCHAR(100),
    quiero              TEXT,
    para                TEXT,
    prioridad           TINYINT NOT NULL DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),
    story_points        SMALLINT,
    estimacion_dias     DECIMAL(5,1),
    estado              ENUM('por_hacer','en_progreso','terminado','eliminado') NOT NULL DEFAULT 'por_hacer',
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_epica) REFERENCES epica(id_epica) ON DELETE CASCADE
);

-- Índices en historia_usuario
CREATE INDEX idx_historia_epica ON historia_usuario(id_epica);
CREATE INDEX idx_historia_estado ON historia_usuario(estado);

-- Criterios de aceptación
CREATE TABLE criterio_aceptacion (
    id_criterio     INT AUTO_INCREMENT PRIMARY KEY,
    id_historia     INT NOT NULL,
    descripcion     TEXT NOT NULL,
    cumplido        TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_historia) REFERENCES historia_usuario(id_historia) ON DELETE CASCADE
);

-- Índices en criterio_aceptacion
CREATE INDEX idx_criterio_historia ON criterio_aceptacion(id_historia);

-- Etiquetas asignadas a una historia
CREATE TABLE historia_etiqueta (
    id_historia     INT NOT NULL,
    id_etiqueta     INT NOT NULL,
    PRIMARY KEY (id_historia, id_etiqueta),
    FOREIGN KEY (id_historia) REFERENCES historia_usuario(id_historia) ON DELETE CASCADE,
    FOREIGN KEY (id_etiqueta) REFERENCES etiqueta(id_etiqueta) ON DELETE CASCADE
);

-- Comentarios sobre historias
CREATE TABLE comentario_historia (
    id_comentario   INT AUTO_INCREMENT PRIMARY KEY,
    id_historia     INT NOT NULL,
    id_usuario      INT NOT NULL,
    comentario      TEXT NOT NULL,
    fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_historia) REFERENCES historia_usuario(id_historia) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario)  REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Índices en comentario_historia
CREATE INDEX idx_comentario_historia ON comentario_historia(id_historia);

-- ============================================================
-- MÓDULO 3 — SPRINTS
-- ============================================================

-- Sprints del proyecto
CREATE TABLE sprint (
    id_sprint           INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto         INT NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    meta                TEXT,
    fecha_inicio        DATETIME NOT NULL,
    fecha_fin           DATETIME NOT NULL,
    estado              ENUM('planeado','en_curso','completado','cancelado') NOT NULL DEFAULT 'planeado',
    velocidad_estimada  SMALLINT,
    velocidad_real      SMALLINT,
    fecha_liberacion    DATE,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE
);

-- Índices en sprint
CREATE INDEX idx_sprint_proyecto ON sprint(id_proyecto);
CREATE INDEX idx_sprint_estado ON sprint(estado);

-- Reuniones del sprint
CREATE TABLE meeting (
    id_meeting INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    sprint VARCHAR(100) NOT NULL,
    status VARCHAR(100) DEFAULT 'programada',
    date DATETIME NOT NULL,
    type VARCHAR(100),
    startTime VARCHAR(20),
    duration VARCHAR(50),
    room VARCHAR(100),
    link VARCHAR(255),
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_meeting_sprint ON meeting(sprint);
CREATE INDEX idx_meeting_date ON meeting(date);

-- Agregar FK en historia_usuario
ALTER TABLE historia_usuario
    ADD CONSTRAINT fk_hu_sprint
    FOREIGN KEY (id_sprint) REFERENCES sprint(id_sprint) ON DELETE SET NULL;

-- Índice en historia_usuario para sprint
CREATE INDEX idx_historia_sprint ON historia_usuario(id_sprint);

-- Tabla pivot sprint ↔ historia
CREATE TABLE sprint_historia (
    id_sprint       INT NOT NULL,
    id_historia     INT NOT NULL,
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_sprint, id_historia),
    FOREIGN KEY (id_sprint)   REFERENCES sprint(id_sprint) ON DELETE CASCADE,
    FOREIGN KEY (id_historia) REFERENCES historia_usuario(id_historia) ON DELETE CASCADE
);

-- Tabla pivot sprint ↔ épica (relación muchos a muchos)
CREATE TABLE sprint_epica (
    id_sprint       INT NOT NULL,
    id_epica        INT NOT NULL,
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_sprint, id_epica),
    FOREIGN KEY (id_sprint)   REFERENCES sprint(id_sprint) ON DELETE CASCADE,
    FOREIGN KEY (id_epica)    REFERENCES epica(id_epica) ON DELETE CASCADE
);

-- Índice en sprint_epica
CREATE INDEX idx_sprint_epica_epica ON sprint_epica(id_epica);

-- ============================================================
-- MÓDULO 4 — TABLÓN DE TAREAS (KANBAN / SCRUM BOARD)
-- ============================================================

-- Tareas
CREATE TABLE tarea (
    id_tarea            INT AUTO_INCREMENT PRIMARY KEY,
    id_historia         INT NOT NULL,
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    tipo                ENUM('RF','RNF','bug','mejora','otro') NOT NULL DEFAULT 'RF',
    estado              ENUM('por_hacer','en_progreso','terminado','bloqueado') NOT NULL DEFAULT 'por_hacer',
    prioridad           ENUM('baja','media','alta','critica') NOT NULL DEFAULT 'media',
    story_points        SMALLINT,
    estimacion_dias     DECIMAL(5,1),
    tiempo_real         DECIMAL(5,2) DEFAULT 0,
    orden_columna       INT NOT NULL DEFAULT 0,
    fecha_inicio        DATETIME,
    fecha_fin_est       DATETIME,
    fecha_fin_real      DATETIME,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_historia) REFERENCES historia_usuario(id_historia) ON DELETE CASCADE
);

-- Índices en tarea
CREATE INDEX idx_tarea_historia ON tarea(id_historia);
CREATE INDEX idx_tarea_estado ON tarea(estado);

-- Asignación de usuarios a tareas
CREATE TABLE tarea_usuario (
    id_tarea        INT NOT NULL,
    id_usuario      INT NOT NULL,
    es_responsable  TINYINT(1) NOT NULL DEFAULT 0,
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_tarea, id_usuario),
    FOREIGN KEY (id_tarea)   REFERENCES tarea(id_tarea) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Índices en tarea_usuario
CREATE INDEX idx_tarea_usuario_usuario ON tarea_usuario(id_usuario);

-- Historial de cambios de estado
CREATE TABLE historial_tarea (
    id_historial        INT AUTO_INCREMENT PRIMARY KEY,
    id_tarea            INT NOT NULL,
    id_usuario          INT NOT NULL,
    estado_anterior     ENUM('por_hacer','en_progreso','terminado','bloqueado'),
    estado_nuevo        ENUM('por_hacer','en_progreso','terminado','bloqueado') NOT NULL,
    observacion         TEXT,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tarea)   REFERENCES tarea(id_tarea) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Índices en historial_tarea
CREATE INDEX idx_historial_tarea ON historial_tarea(id_tarea);
CREATE INDEX idx_historial_fecha ON historial_tarea(fecha);

-- Etiquetas asignadas a una tarea
CREATE TABLE tarea_etiqueta (
    id_tarea        INT NOT NULL,
    id_etiqueta     INT NOT NULL,
    PRIMARY KEY (id_tarea, id_etiqueta),
    FOREIGN KEY (id_tarea)   REFERENCES tarea(id_tarea) ON DELETE CASCADE,
    FOREIGN KEY (id_etiqueta) REFERENCES etiqueta(id_etiqueta) ON DELETE CASCADE
);

-- Comentarios sobre tareas
CREATE TABLE comentario_tarea (
    id_comentario   INT AUTO_INCREMENT PRIMARY KEY,
    id_tarea        INT NOT NULL,
    id_usuario      INT NOT NULL,
    comentario      TEXT NOT NULL,
    fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tarea)   REFERENCES tarea(id_tarea) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Índices en comentario_tarea
CREATE INDEX idx_comentario_tarea ON comentario_tarea(id_tarea);

-- ============================================================
-- MÓDULO 5 — DOCUMENTOS
-- ============================================================

CREATE TABLE documento_proyecto (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo_archivo VARCHAR(50),
    id_usuario_creador INT,
    id_usuario_modificacion INT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    version_actual INT DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_creador) REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario_modificacion) REFERENCES usuario(id_usuario) ON DELETE SET NULL
);

CREATE TABLE documento_version (
    id_version INT AUTO_INCREMENT PRIMARY KEY,
    id_documento INT NOT NULL,
    numero_version INT NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    r2_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    tamano_bytes BIGINT,
    comentario TEXT,
    id_usuario INT,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_documento) REFERENCES documento_proyecto(id_documento) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL
);

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
-- $2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe = 123456
INSERT INTO usuario (id_usuario, email, password, nombre, telefono, ciudad) VALUES
(1, 'po1@demo.com',     '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'Ana Product Owner',   '3000000001', 'Bogotá'),
(2, 'sm1@demo.com',     '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'Carlos Scrum Master', '3000000002', 'Medellín'),
(3, 'dev1@demo.com',    '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'David Developer 1',   '3000000003', 'Cali'),
(4, 'dev2@demo.com',    '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'Elena Developer 2',   '3000000004', 'Bogotá'),
(5, 'dev3@demo.com',    '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'Felipe Developer 3',  '3000000005', 'Barranquilla'),
(6, 'po2@demo.com',     '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'Gloria PO Ecommerce', '3000000006', 'Bogotá'),
(7, 'sm2@demo.com',     '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'Hugo SM Ecommerce',   '3000000007', 'Medellín'),
(8, 'po3@demo.com',     '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'Irene PO Banking',    '3000000008', 'Cali'),
(9, 'sm3@demo.com',     '$2a$10$34mKIwfSDugdiiTNTkHPfOy7Sb26BWcfnaeET.NO1kEOGy2ubOUEe', 'Jorge SM Banking',    '3000000009', 'Bogotá');

-- Roles globales a usuarios
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES
(1, 1), (2, 2), (3, 3), (4, 3), (5, 3), (6, 1), (7, 2), (8, 1), (9, 2);

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
(1, 'Scrum Track Development', 'Desarrollo de la plataforma principal de gestión ágil', 'Desarrollo de software', 'activo', 'SCRUMDEV', 5, 1);

INSERT INTO equipo_proyecto (id_equipo_proyecto, id_proyecto, nombre, descripcion) VALUES
(1, 1, 'Equipo ScrumTrack', 'Equipo de desarrollo principal');

INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES
(1, 1, 1), (2, 1, 2), (3, 1, 3), (4, 1, 3), (5, 1, 3);

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
-- NOTIFICACIONES
-- ============================================================
INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje) VALUES
(3, 'informativa', 'Nueva Tarea Asignada', 'Se te ha asignado la tarea: UI Crear Sprint en el proyecto Scrum Track Development.'),
(4, 'informativa', 'Nueva Tarea Asignada', 'Se te ha asignado la tarea: Columnas Drag and Drop en el proyecto Scrum Track Development.'),
(1, 'informativa', 'Estado cambiado', 'La historia Login de usuario ha sido terminada.'),
(6, 'urgente', 'Planeación de Sprint', 'Recuerda que debes iniciar el Sprint 1 de E-commerce.'),
(8, 'informativa', 'Proyecto Completado', 'El proyecto Mobile Banking App ha finalizado con éxito.');

