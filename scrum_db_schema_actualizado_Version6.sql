-- ============================================================
-- BASE DE DATOS: scrum_db
-- Proyecto: Sistema de Gestión de Proyectos con Scrum
-- Alcance: Módulos 1 al 4 + Nuevos Roles (Coordinador, Instructor Líder)
--   1. Gestión de Roles y Usuarios
--   2. Backlog de Producto
--   3. Sprints
--   4. Tablón de Tareas (Kanban / Scrum Board)
--   5. Nuevos Roles: Coordinador e Instructor Líder
-- Versión: 6.0 (añadidos rol_plataforma en usuario, numero_ficha en proyecto)
-- ============================================================

DROP DATABASE IF EXISTS scrum_db;

CREATE DATABASE scrum_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE scrum_db;

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
-- NUEVO: campo rol_plataforma para identificar Coordinador e Instructor Líder
CREATE TABLE usuario (
    id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(200) NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    telefono        VARCHAR(20),
    ciudad          VARCHAR(100),
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    rol_plataforma  ENUM('coordinador', 'instructor_lider') NULL,  -- NUEVO CAMPO
    fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Índices en usuario
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_activo ON usuario(activo);
CREATE INDEX idx_usuario_rol_plataforma ON usuario(rol_plataforma);  -- NUEVO ÍNDICE

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
-- NUEVO: campo numero_ficha para identificar la ficha/grupo del SENA
CREATE TABLE proyecto (
    id_proyecto     INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    tipo            VARCHAR(100),
    estado          ENUM('inicio','activo','pausado','completado','cancelado') NOT NULL DEFAULT 'activo',
    fecha_inicio    DATE,
    fecha_fin_est   DATE,
    codigo_proyecto VARCHAR(10) NOT NULL UNIQUE,
    numero_ficha    VARCHAR(20) NULL,  -- NUEVO CAMPO: número de ficha (solo números)
    creado_por      INT NOT NULL,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

-- Índice para filtrar por ficha
CREATE INDEX idx_proyecto_ficha ON proyecto(numero_ficha);  -- NUEVO ÍNDICE

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
    id_tarea            INT DEFAULT NULL,
    id_sprint           INT DEFAULT NULL,
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
    id_sprint INT DEFAULT NULL,
    status VARCHAR(100) DEFAULT 'programada',
    date DATETIME NOT NULL,
    type VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'estandar',
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
    id_usuario_responsable INT,
    fecha_inicio        DATETIME,
    fecha_fin_est       DATETIME,
    fecha_fin_real      DATETIME,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_historia) REFERENCES historia_usuario(id_historia) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_responsable) REFERENCES usuario(id_usuario) ON DELETE SET NULL
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
-- DATOS DE PRUEBA
-- ============================================================

-- Permisos base
INSERT INTO permiso (nombre, descripcion) VALUES
('ver_backlog',         'Visualizar el backlog del producto'),
('editar_backlog',      'Crear y modificar épicas e historias'),
('gestionar_sprints',   'Crear, iniciar y cerrar sprints'),
('mover_tareas',        'Arrastrar tareas en el tablero'),
('gestionar_equipo',    'Agregar y asignar miembros al equipo'),
('ver_metricas',        'Ver burndown y métricas del sprint');

-- Roles del sistema
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

-- ============================================================
-- USUARIOS DE PRUEBA
-- ============================================================

-- Usuarios existentes (equipo del proyecto)
INSERT INTO usuario (email, password, nombre, telefono, ciudad) VALUES
('mariana@gmail.com',     '$2a$10$SrJgihtLEYaZVXZUGfSeLeQafUnqhPem6UhbdKNsLjiN9PdFH7VIa',     'Mariana García',   '3256321587', 'Bogotá'),
('sofia@gmail.com',       '$2a$10$SrJgihtLEYaZVXZUGfSeLeyOaFZUc4hpcfYpeFDetloS4Ul5K2yRC',     'Sofía Bonilla',    '3101234567', 'Bogotá'),
('jefferson@gmail.com',   '$2a$10$SrJgihtLEYaZVXZUGfSeLeoDu3Ao2J6PLIVLWIkYecmXMmkUOArwm',     'Jefferson López',  '3026984120', 'Medellín'),
('johan@gmail.com',       '$2a$10$SrJgihtLEYaZVXZUGfSeLeDweOSRbhc.BuRtdVaYQRzbUq3wgk04K',     'Johan Rodríguez',  '3147856942', 'Cali'),
('carlos@gmail.com',      '$2a$10$PoIk8UpD40bxdHOjuBd/8eIaJKhXqHEyk3ErR8LLZEMc5n0kF3FEe',     'Carlos Mendes',    '3181234567', 'Medellín'),
('elena@gmail.com',       '$2a$10$lC061lLK0o339z9ONyWzv.7U951qTmWta/jfOhR91E1N7CDBIvNo.',       'Elena Sánchez',    '3209876543', 'Bogotá');

-- NUEVOS USUARIOS: Instructor Líder y Coordinador
-- Misma contraseña hasheada para ambos: "Password123*"
INSERT INTO usuario (email, password, nombre, telefono, ciudad, rol_plataforma) VALUES
('instructor@gmail.com', '$2a$10$bQPYrJbNYDeppXkCefvWNekunUAGXGwUX2oYQqoKQNl2CbWc40o1u', 'Instructor Líder',  '3109876543', 'Bogotá', 'instructor_lider'),
('coordinador@gmail.com','$2a$10$bQPYrJbNYDeppXkCefvWNekunUAGXGwUX2oYQqoKQNl2CbWc40o1u', 'Coordinador General','3156789012', 'Bogotá', 'coordinador');

-- ============================================================
-- ROLES A USUARIOS (ROLES GLOBALES)
-- ============================================================

-- Usuarios existentes
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES
(1, 2),  -- Mariana: Scrum Master
(2, 1),  -- Sofía: Product Owner
(3, 3),  -- Jefferson: Developer
(4, 3);  -- Johan: Developer

-- NUEVOS: Instructor Líder y Coordinador
-- El Instructor Líder tiene el mismo rol de PO a nivel de plataforma
-- El Coordinador no tiene rol Scrum específico (es solo de visualización)
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES
(7, 1),  -- Instructor Líder: Product Owner (a nivel global)
(8, 5);  -- Coordinador: Stakeholder (solo lectura)

-- ============================================================
-- HABILIDADES
-- ============================================================

INSERT INTO habilidad (nombre, categoria) VALUES
('JavaScript',   'Desarrollador'),
('MySQL',        'Desarrollador'),
('React',        'Desarrollador'),
('Node.js',      'Desarrollador'),
('Express',      'Desarrollador'),
('Figma',        'Diseñador'),
('Scrum',        'Gestión'),
('Python',       'Desarrollador');

-- Habilidades de usuarios
INSERT INTO usuario_habilidad (id_usuario, id_habilidad, nivel) VALUES
(1, 7, 'Avanzado'),     -- Mariana: Scrum
(2, 7, 'Avanzado'),     -- Sofía: Scrum
(3, 1, 'Intermedio'),   -- Jefferson: JavaScript
(3, 2, 'Intermedio'),   -- Jefferson: MySQL
(3, 4, 'Básico'),       -- Jefferson: Node.js
(4, 1, 'Avanzado'),     -- Johan: JavaScript
(4, 4, 'Avanzado'),     -- Johan: Node.js
(4, 5, 'Intermedio'),   -- Johan: Express
(7, 7, 'Avanzado');     -- Instructor Líder: Scrum

-- ============================================================
-- PERFILES
-- ============================================================

INSERT INTO perfil_usuario (id_usuario, descripcion_personal, visibilidad) VALUES
(1, 'Scrum Master certificada con 3 años de experiencia en proyectos ágiles.', 'publico'),
(2, 'Product Owner especializada en metodologías ágiles y gestión de backlog.', 'publico'),
(3, 'Developer full-stack con experiencia en JavaScript y bases de datos MySQL.', 'publico'),
(4, 'Developer con expertise en Node.js, Express y desarrollo backend.', 'publico'),
(7, 'Instructor Líder con experiencia en formación técnica y gestión de proyectos Scrum.', 'publico'),
(8, 'Coordinador General con acceso de supervisión a todos los proyectos de la plataforma.', 'publico');

-- ============================================================
-- ETIQUETAS DEL TABLERO
-- ============================================================

INSERT INTO etiqueta (nombre, color) VALUES
('Alta prioridad',  '#FF5733'),
('Bloqueada',       '#C0392B'),
('Bug',             '#E74C3C'),
('Mejora',          '#3498DB'),
('Revisión',        '#F39C12'),
('Testing',         '#27AE60'),
('Documentación',   '#9B59B6');

-- ============================================================
-- PROYECTOS DE PRUEBA
-- ============================================================

-- Proyecto existente (creado por Sofía)
INSERT INTO proyecto (nombre, descripcion, tipo, estado, codigo_proyecto, creado_por, fecha_inicio, fecha_fin_est) VALUES
('App Scrum', 'Sistema de gestión de proyectos con metodología Scrum para equipos ágiles', 'Desarrollo de software', 'activo', 'SCRUM001', 2, '2026-01-15', '2026-12-20');

-- NUEVO: Proyecto creado por el Instructor Líder (con número de ficha)
INSERT INTO proyecto (nombre, descripcion, tipo, estado, codigo_proyecto, numero_ficha, creado_por, fecha_inicio, fecha_fin_est) VALUES
('Proyecto Web Ficha 12345', 'Desarrollo de aplicación web para gestión de inventarios del SENA', 'Desarrollo de software', 'activo', 'FICH001', '12345', 7, '2026-03-01', '2026-09-30'),
('Proyecto Móvil Ficha 12345', 'Aplicación móvil para seguimiento de aprendices del SENA', 'Desarrollo de software', 'activo', 'FICH002', '12345', 7, '2026-04-01', '2026-10-31'),
('Proyecto IoT Ficha 67890', 'Sistema IoT para monitoreo de laboratorios del SENA', 'Internet de las Cosas', 'activo', 'FICH003', '67890', 7, '2026-05-15', '2026-11-30');

-- ============================================================
-- EQUIPOS DE PROYECTO
-- ============================================================

-- Equipo del proyecto existente
INSERT INTO equipo_proyecto (id_proyecto, nombre, descripcion) VALUES
(1, 'Equipo Alpha', 'Equipo principal de desarrollo del proyecto final');

-- NUEVOS: Equipos de los proyectos del Instructor Líder
INSERT INTO equipo_proyecto (id_proyecto, nombre, descripcion) VALUES
(2, 'Equipo Web Ficha 12345', 'Equipo de desarrollo web del proyecto de inventarios'),
(3, 'Equipo Móvil Ficha 12345', 'Equipo de desarrollo móvil del proyecto SENA'),
(4, 'Equipo IoT Ficha 67890', 'Equipo de IoT para laboratorios SENA');

-- ============================================================
-- INTEGRANTES DE EQUIPOS
-- ============================================================

-- Equipo del proyecto existente
INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES
(1, 1, 2),  -- Mariana: Scrum Master
(2, 1, 1),  -- Sofía: Product Owner
(3, 1, 3),  -- Jefferson: Developer
(4, 1, 3);  -- Johan: Developer

-- NUEVOS: Instructor Líder como PO en sus proyectos
INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES
(7, 2, 1),  -- Instructor Líder: PO en Proyecto Web
(7, 3, 1),  -- Instructor Líder: PO en Proyecto Móvil
(7, 4, 1);  -- Instructor Líder: PO en Proyecto IoT

-- ============================================================
-- ÉPICAS
-- ============================================================

INSERT INTO epica (id_proyecto, nombre, descripcion, categoria, prioridad, estado) VALUES
(1, 'E1 - Landing / Presentación', 'Información de la plataforma para nuevos usuarios', 'UI', 3, 'por_hacer'),
(1, 'E2 - Registro e Inicio de Sesión', 'Autenticación de usuarios con email o Google', 'Seguridad', 1, 'por_hacer'),
(1, 'E3 - Gestión de Proyectos', 'Crear, configurar e ingresar a proyectos', 'Core', 1, 'por_hacer'),
(1, 'E4 - Gestión de Equipo', 'Agregar miembros y asignar roles al equipo', 'Core', 2, 'por_hacer'),
(1, 'E5 - Tablero Kanban', 'Visualizar y gestionar tareas en tablero Kanban', 'Core', 1, 'por_hacer'),
(1, 'E6 - Métricas y Reportes', 'Burndown charts y métricas del sprint', 'Core', 3, 'por_hacer');

-- Épicas para el proyecto del Instructor Líder
INSERT INTO epica (id_proyecto, nombre, descripcion, categoria, prioridad, estado) VALUES
(2, 'EW1 - Gestión de Inventarios', 'Módulo CRUD para gestión de productos y stock', 'Core', 1, 'por_hacer'),
(2, 'EW2 - Reportes de Inventario', 'Generación de reportes y gráficas de movimientos', 'Reportes', 2, 'por_hacer'),
(3, 'EM1 - Seguimiento GPS', 'Rastreo en tiempo real de ubicación de aprendices', 'Core', 1, 'por_hacer'),
(3, 'EM2 - Notificaciones Push', 'Sistema de notificaciones para alertas importantes', 'Comunicación', 2, 'por_hacer');

-- ============================================================
-- HISTORIAS DE USUARIO
-- ============================================================

INSERT INTO historia_usuario (id_epica, nombre, como_quien, quiero, para, prioridad, story_points, estimacion_dias, estado) VALUES
(2, 'Registro de nuevo usuario', 'Usuario de la plataforma', 'registrarme con email y contraseña o con Google', 'acceder a todas las funcionalidades', 1, 3, 1.0, 'por_hacer'),
(2, 'Aceptar términos y condiciones', 'Usuario de la plataforma', 'ver y aceptar los términos durante el registro', 'conocer el uso de mis datos', 2, 1, 0.5, 'por_hacer'),
(2, 'Iniciar sesión', 'Usuario registrado', 'iniciar sesión con email o cuenta de Google', 'acceder al sistema', 1, 2, 1.0, 'por_hacer'),
(3, 'Crear proyecto', 'Usuario', 'crear un proyecto con nombre, descripción y tipo', 'iniciar la gestión de tareas en Scrum', 2, 3, 2.0, 'por_hacer'),
-- Historias para el proyecto del Instructor Líder
(7, 'Crear producto en inventario', 'Instructor', 'agregar un nuevo producto al sistema de inventarios', 'mantener el stock actualizado', 1, 2, 1.5, 'por_hacer'),
(7, 'Actualizar cantidad de stock', 'Instructor', 'modificar la cantidad disponible de un producto', 'controlar el inventario en tiempo real', 1, 1, 0.5, 'por_hacer'),
(8, 'Generar reporte mensual', 'Instructor', 'ver un reporte de movimientos del mes', 'analizar el consumo de materiales', 2, 3, 2.0, 'por_hacer');

-- ============================================================
-- CRITERIOS DE ACEPTACIÓN
-- ============================================================

INSERT INTO criterio_aceptacion (id_historia, descripcion) VALUES
(1, 'El sistema permite registro con email y contraseña, o con Google'),
(1, 'Los correos electrónicos deben ser únicos en la base de datos'),
(1, 'La contraseña debe tener mínimo 8 caracteres, un número y una mayúscula'),
(2, 'Se exige aceptación de términos mediante checkbox; sin aceptarlos no se puede continuar'),
(3, 'El sistema permite inicio de sesión con email/contraseña o Google'),
(3, 'Si Google retorna error, el sistema emite una alerta clara al usuario'),
(4, 'El formulario solicita nombre, descripción y tipo de proyecto'),
(4, 'El proyecto se almacena y queda disponible en el listado del usuario'),
(5, 'El formulario permite ingresar nombre, descripción, categoría y precio del producto'),
(5, 'El sistema valida que el nombre del producto sea único'),
(6, 'Se puede modificar la cantidad y el sistema actualiza el stock inmediatamente'),
(7, 'El reporte muestra: productos movidos, cantidades, fechas y responsável');

-- ============================================================
-- SPRINTS
-- ============================================================

-- Sprint del proyecto existente
INSERT INTO sprint (id_proyecto, nombre, meta, fecha_inicio, fecha_fin, estado, velocidad_estimada) VALUES
(1, 'S1 - Autenticación', 'Completar módulo de autenticación e inicio de sesión', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'planeado', 9);

-- Sprint del proyecto del Instructor Líder
INSERT INTO sprint (id_proyecto, nombre, meta, fecha_inicio, fecha_fin, estado, velocidad_estimada) VALUES
(2, 'S1 - Inventario Base', 'Implementar CRUD básico de productos', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY), 'planeado', 8);

-- Asignar historias al sprint 1 del proyecto 1
INSERT INTO sprint_historia (id_sprint, id_historia) VALUES
(1, 1), (1, 2), (1, 3);

UPDATE historia_usuario SET id_sprint = 1 WHERE id_historia IN (1, 2, 3);

-- Asignar historias al sprint 1 del proyecto 2 (Instructor Líder)
INSERT INTO sprint_historia (id_sprint, id_historia) VALUES
(2, 5), (2, 6);

UPDATE historia_usuario SET id_sprint = 2 WHERE id_historia IN (5, 6);

-- Asignar épicas al sprint 1 del proyecto 1
INSERT INTO sprint_epica (id_sprint, id_epica) VALUES
(1, 2), (1, 3);

-- Asignar épicas al sprint 1 del proyecto 2
INSERT INTO sprint_epica (id_sprint, id_epica) VALUES
(2, 7);

-- ============================================================
-- TAREAS
-- ============================================================

-- Tareas del sprint 1 del proyecto 1
INSERT INTO tarea (id_historia, nombre, tipo, estado, prioridad, estimacion_dias, orden_columna) VALUES
(1, 'Diseñar formulario de registro', 'RF', 'por_hacer', 'alta', 1.0, 1),
(1, 'Implementar validación de contraseña', 'RF', 'por_hacer', 'alta', 0.5, 2),
(1, 'Integración OAuth Google', 'RF', 'por_hacer', 'alta', 1.0, 3),
(3, 'Diseñar pantalla de login', 'RF', 'por_hacer', 'alta', 0.5, 1),
(3, 'Implementar lógica de autenticación JWT', 'RF', 'por_hacer', 'critica', 1.0, 2);

-- Tareas del sprint 1 del proyecto 2 (Instructor Líder)
INSERT INTO tarea (id_historia, nombre, tipo, estado, prioridad, estimacion_dias, orden_columna) VALUES
(5, 'Diseñar formulario de producto', 'RF', 'por_hacer', 'alta', 1.0, 1),
(5, 'Implementar CRUD de productos', 'RF', 'por_hacer', 'critica', 2.0, 2),
(6, 'Crear endpoint de actualización de stock', 'RF', 'por_hacer', 'alta', 0.5, 1),
(7, 'Diseñar plantilla de reporte', 'RF', 'por_hacer', 'media', 1.0, 1);

-- ============================================================
-- ASIGNACIONES DE TAREAS A USUARIOS
-- ============================================================

-- Tareas del proyecto 1
INSERT INTO tarea_usuario (id_tarea, id_usuario, es_responsable) VALUES
(1, 3, 1), (2, 3, 1), (3, 4, 1), (4, 3, 1), (5, 4, 1);

-- Tareas del proyecto 2 (Instructor Líder asigna)
INSERT INTO tarea_usuario (id_tarea, id_usuario, es_responsable) VALUES
(6, 7, 1), (7, 7, 1), (8, 7, 1), (9, 7, 1);

-- ============================================================
-- ETIQUETAS EN TAREAS
-- ============================================================

INSERT INTO tarea_etiqueta (id_tarea, id_etiqueta) VALUES
(3, 1), (5, 1);

-- ============================================================
-- COMENTARIOS EN TAREAS
-- ============================================================

INSERT INTO comentario_tarea (id_tarea, id_usuario, comentario) VALUES
(1, 1, 'Validar que el diseño sea responsive (RWD)'),
(5, 2, 'Usar librería passport.js para JWT');

-- ============================================================
-- SOLICITUDES DE INGRESO A PROYECTO
-- ============================================================

INSERT INTO solicitud (id_proyecto, id_usuario, id_usuario_creador, mensaje_opcional, estado) VALUES
(1, 5, 5, 'Me interesa unirme a este proyecto Scrum como Developer', 'Pendiente'),
(1, 6, 6, 'Quiero participar en el desarrollo de la app Scrum', 'Pendiente'),
(2, 3, 3, 'Quiero participar en el proyecto de inventarios como Developer', 'Pendiente'),
(2, 4, 4, 'Me gustaría colaborar en el desarrollo web del SENA', 'Pendiente'),
-- Solicitudes para el proyecto del Instructor Líder
(2, 5, 5, 'Quiero aportar al proyecto web del SENA como Developer', 'Pendiente'),
(2, 6, 6, 'Me interesa el desarrollo web con React y Node.js', 'Pendiente');

-- ============================================================
-- NOTIFICACIONES DE PRUEBA
-- ============================================================

INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje) VALUES
(3, 'informativa', 'Sprint 1 iniciado', 'El Sprint 1 ha sido creado. Revisa tus tareas asignadas en el tablero.'),
(4, 'informativa', 'Sprint 1 iniciado', 'El Sprint 1 ha sido creado. Revisa tus tareas asignadas en el tablero.'),
(1, 'prioritaria', 'Nuevo sprint creado', 'Se ha creado el Sprint 1 - Autenticación. Comienza en 2 días.');

INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, id_solicitud) VALUES
(7, 'prioritaria', 'Nueva solicitud de ingreso', 'Carlos Mendes ha solicitado unirse al proyecto "Proyecto Web Ficha 12345"', 5),
(7, 'prioritaria', 'Nueva solicitud de ingreso', 'Elena Sánchez ha solicitado unirse al proyecto "Proyecto Web Ficha 12345"', 6);

-- ============================================================
-- CONSULTAS DE VERIFICACIÓN
-- ============================================================

SELECT 'usuarios'           AS tabla, COUNT(*) AS registros FROM usuario
UNION ALL
SELECT 'roles',              COUNT(*) FROM rol
UNION ALL
SELECT 'permisos',           COUNT(*) FROM permiso
UNION ALL
SELECT 'proyectos',          COUNT(*) FROM proyecto
UNION ALL
SELECT 'epicas',             COUNT(*) FROM epica
UNION ALL
SELECT 'historias',          COUNT(*) FROM historia_usuario
UNION ALL
SELECT 'criterios_ac',       COUNT(*) FROM criterio_aceptacion
UNION ALL
SELECT 'sprints',            COUNT(*) FROM sprint
UNION ALL
SELECT 'tareas',             COUNT(*) FROM tarea
UNION ALL
SELECT 'tarea_usuario',      COUNT(*) FROM tarea_usuario
UNION ALL
SELECT 'notificaciones',     COUNT(*) FROM notificacion
UNION ALL
SELECT 'equipo_proyecto',    COUNT(*) FROM equipo_proyecto;

-- ============================================================
-- CONSULTAS DE VERIFICACIÓN ADICIONALES
-- ============================================================

-- Verificar usuarios con rol de plataforma
SELECT 'USUARIOS CON ROL DE PLATAFORMA' AS info;
SELECT u.id_usuario, u.email, u.nombre, u.rol_plataforma, r.nombre_rol AS rol_global
FROM usuario u
LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
LEFT JOIN rol r ON ur.id_rol = r.id_rol
WHERE u.rol_plataforma IS NOT NULL;

-- Verificar proyectos con número de ficha
SELECT 'PROYECTOS CON NÚMERO DE FICHA' AS info;
SELECT p.id_proyecto, p.nombre, p.numero_ficha, p.codigo_proyecto, 
       u.nombre AS creado_por, u.rol_plataforma
FROM proyecto p
JOIN usuario u ON p.creado_por = u.id_usuario
WHERE p.numero_ficha IS NOT NULL;

-- Verificar membresías del Instructor Líder
SELECT 'MEMBRESÍAS DEL INSTRUCTOR LÍDER' AS info;
SELECT u.nombre, p.nombre AS proyecto, r.nombre_rol AS rol_en_proyecto
FROM usuario u
JOIN usuario_equipo_proyecto uep ON u.id_usuario = uep.id_usuario
JOIN equipo_proyecto eq ON uep.id_equipo_proyecto = eq.id_equipo_proyecto
JOIN proyecto p ON eq.id_proyecto = p.id_proyecto
JOIN rol r ON uep.id_rol = r.id_rol
WHERE u.email = 'instructor@gmail.com';
