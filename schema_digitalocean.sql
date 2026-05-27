-- ============================================================
-- BASE DE DATOS: scrum_db
-- Proyecto: Sistema de GestiÃ³n de Proyectos con Scrum
-- Alcance: MÃ³dulos 1 al 4
--   1. GestiÃ³n de Roles y Usuarios
--   2. Backlog de Producto
--   3. Sprints
--   4. TablÃ³n de Tareas (Kanban / Scrum Board)
-- VersiÃ³n: 2.1 (optimizada con Ã­ndices y mejoras)
-- ============================================================



-- ============================================================
-- MÃ“DULO 1 â€” GESTIÃ“N DE ROLES Y USUARIOS
-- ============================================================

-- Tabla de permisos funcionales del sistema
CREATE TABLE permiso (
    id_permiso      INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     VARCHAR(255),
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Roles del sistema (Product Owner, Scrum Master, Developer, etc.)
CREATE TABLE rol (
    id_rol          INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol      VARCHAR(100) NOT NULL UNIQUE,
    descripcion     VARCHAR(255),
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RelaciÃ³n rol â†’ permisos (quÃ© puede hacer cada rol)
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
    fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Ãndices en usuario
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_activo ON usuario(activo);

-- RelaciÃ³n usuario â†” rol (con fecha de asignaciÃ³n)
CREATE TABLE usuario_rol (
    id_usuario          INT NOT NULL,
    id_rol              INT NOT NULL,
    fecha_asignacion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_rol),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_rol)     REFERENCES rol(id_rol) ON DELETE CASCADE
);

-- Habilidades tÃ©cnicas o de rol
CREATE TABLE habilidad (
    id_habilidad    INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    categoria       VARCHAR(100),
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RelaciÃ³n usuario â†” habilidad
CREATE TABLE usuario_habilidad (
    id_usuario      INT NOT NULL,
    id_habilidad    INT NOT NULL,
    nivel           VARCHAR(50),
    PRIMARY KEY (id_usuario, id_habilidad),
    FOREIGN KEY (id_usuario)   REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_habilidad) REFERENCES habilidad(id_habilidad) ON DELETE CASCADE
);

-- Perfil pÃºblico del usuario
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
-- MÃ“DULO 2 â€” BACKLOG DE PRODUCTO
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
    mensaje_opcional  TEXT,
    estado            ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Cancelada') DEFAULT 'Pendiente',
    motivo            TEXT,
    id_rol            INT DEFAULT NULL,
    fecha_creacion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol) ON DELETE SET NULL
);

-- Notificaciones del sistema
CREATE TABLE notificacion (
    id_notificacion     INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario          INT NOT NULL,
    tipo                ENUM('sistema','urgente','prioritaria','mensajeria','informativa','recordatorio') NOT NULL DEFAULT 'informativa',
    titulo              VARCHAR(200) NOT NULL,
    mensaje             TEXT,
    leida               TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_solicitud        INT DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud) ON DELETE CASCADE
);

-- Ãndices en notificaciÃ³n
CREATE INDEX idx_notificacion_usuario ON notificacion(id_usuario);
CREATE INDEX idx_notificacion_leida ON notificacion(leida);

-- Ãndices en proyecto
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

-- Ã‰picas del backlog
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

-- Ãndices en epica
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

-- Ãndices en historia_usuario
CREATE INDEX idx_historia_epica ON historia_usuario(id_epica);
CREATE INDEX idx_historia_estado ON historia_usuario(estado);

-- Criterios de aceptaciÃ³n
CREATE TABLE criterio_aceptacion (
    id_criterio     INT AUTO_INCREMENT PRIMARY KEY,
    id_historia     INT NOT NULL,
    descripcion     TEXT NOT NULL,
    cumplido        TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_historia) REFERENCES historia_usuario(id_historia) ON DELETE CASCADE
);

-- Ãndices en criterio_aceptacion
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

-- Ãndices en comentario_historia
CREATE INDEX idx_comentario_historia ON comentario_historia(id_historia);

-- ============================================================
-- MÃ“DULO 3 â€” SPRINTS
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

-- Ãndices en sprint
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

-- Ãndice en historia_usuario para sprint
CREATE INDEX idx_historia_sprint ON historia_usuario(id_sprint);

-- Tabla pivot sprint â†” historia
CREATE TABLE sprint_historia (
    id_sprint       INT NOT NULL,
    id_historia     INT NOT NULL,
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_sprint, id_historia),
    FOREIGN KEY (id_sprint)   REFERENCES sprint(id_sprint) ON DELETE CASCADE,
    FOREIGN KEY (id_historia) REFERENCES historia_usuario(id_historia) ON DELETE CASCADE
);

-- ============================================================
-- MÃ“DULO 4 â€” TABLÃ“N DE TAREAS (KANBAN / SCRUM BOARD)
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

-- Ãndices en tarea
CREATE INDEX idx_tarea_historia ON tarea(id_historia);
CREATE INDEX idx_tarea_estado ON tarea(estado);

-- AsignaciÃ³n de usuarios a tareas
CREATE TABLE tarea_usuario (
    id_tarea        INT NOT NULL,
    id_usuario      INT NOT NULL,
    es_responsable  TINYINT(1) NOT NULL DEFAULT 0,
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_tarea, id_usuario),
    FOREIGN KEY (id_tarea)   REFERENCES tarea(id_tarea) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Ãndices en tarea_usuario
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

-- Ãndices en historial_tarea
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

-- Ãndices en comentario_tarea
CREATE INDEX idx_comentario_tarea ON comentario_tarea(id_tarea);

-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

-- Permisos base
INSERT INTO permiso (nombre, descripcion) VALUES
('ver_backlog',         'Visualizar el backlog del producto'),
('editar_backlog',      'Crear y modificar Ã©picas e historias'),
('gestionar_sprints',   'Crear, iniciar y cerrar sprints'),
('mover_tareas',        'Arrastrar tareas en el tablero'),
('gestionar_equipo',    'Agregar y asignar miembros al equipo'),
('ver_metricas',        'Ver burndown y mÃ©tricas del sprint');

-- Roles
INSERT INTO rol (nombre_rol, descripcion) VALUES
('Product Owner',  'Define y prioriza el backlog'),
('Scrum Master',   'Facilita el proceso Scrum'),
('Developer',      'Desarrolla las tareas del sprint'),
('Designer',       'DiseÃ±a interfaces y experiencia de usuario'),
('Stakeholder',    'Interesado externo, solo lectura');

-- Permisos por rol
INSERT INTO rol_permiso VALUES
(1,1),(1,2),(1,3),(1,5),(1,6),  -- Product Owner
(2,1),(2,3),(2,4),(2,5),(2,6),  -- Scrum Master
(3,1),(3,4),                    -- Developer
(4,1),(4,4),                    -- Designer
(5,1),(5,6);                    -- Stakeholder

-- Usuarios (Equipo del proyecto)
INSERT INTO usuario (email, password, nombre, telefono, ciudad) VALUES
('mariana@gmail.com',     '$2a$10$SrJgihtLEYaZVXZUGfSeLeQafUnqhPem6UhbdKNsLjiN9PdFH7VIa',     'Mariana GarcÃ­a',   '3256321587', 'BogotÃ¡'),
('sofia@gmail.com',       '$2a$10$SrJgihtLEYaZVXZUGfSeLeyOaFZUc4hpcfYpeFDetloS4Ul5K2yRC',     'SofÃ­a Bonilla',    '3101234567', 'BogotÃ¡'),
('jefferson@gmail.com',   '$2a$10$SrJgihtLEYaZVXZUGfSeLeoDu3Ao2J6PLIVLWIkYecmXMmkUOArwm',     'Jefferson LÃ³pez',  '3026984120', 'MedellÃ­n'),
('johan@gmail.com',       '$2a$10$SrJgihtLEYaZVXZUGfSeLeDweOSRbhc.BuRtdVaYQRzbUq3wgk04K',     'Johan RodrÃ­guez',  '3147856942', 'Cali'),
('carlos@gmail.com',      '$2a$10$PoIk8UpD40bxdHOjuBd/8eIaJKhXqHEyk3ErR8LLZEMc5n0kF3FEe',     'Carlos Mendes',    '3181234567', 'MedellÃ­n'),
('elena@gmail.com',       '$2a$10$lC061lLK0o339z9ONyWzv.7U951qTmWta/jfOhR91E1N7CDBIvNo.',       'Elena SÃ¡nchez',    '3209876543', 'BogotÃ¡');

-- Roles a usuarios
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES
(1, 2),  -- Mariana: Scrum Master
(2, 1),  -- SofÃ­a: Product Owner
(3, 3),  -- Jefferson: Developer
(4, 3);  -- Johan: Developer

-- Habilidades
INSERT INTO habilidad (nombre, categoria) VALUES
('JavaScript',   'Desarrollador'),
('MySQL',        'Desarrollador'),
('React',        'Desarrollador'),
('Node.js',      'Desarrollador'),
('Express',      'Desarrollador'),
('Figma',        'DiseÃ±ador'),
('Scrum',        'GestiÃ³n'),
('Python',       'Desarrollador');

-- Habilidades de usuarios
INSERT INTO usuario_habilidad (id_usuario, id_habilidad, nivel) VALUES
(1, 7, 'Avanzado'),     -- Mariana: Scrum
(2, 7, 'Avanzado'),     -- SofÃ­a: Scrum
(3, 1, 'Intermedio'),   -- Jefferson: JavaScript
(3, 2, 'Intermedio'),   -- Jefferson: MySQL
(3, 4, 'BÃ¡sico'),       -- Jefferson: Node.js
(4, 1, 'Avanzado'),     -- Johan: JavaScript
(4, 4, 'Avanzado'),     -- Johan: Node.js
(4, 5, 'Intermedio');   -- Johan: Express

-- Perfiles
INSERT INTO perfil_usuario (id_usuario, descripcion_personal, visibilidad) VALUES
(1, 'Scrum Master certificada con 3 aÃ±os de experiencia en proyectos Ã¡giles.', 'publico'),
(2, 'Product Owner especializada en metodologÃ­as Ã¡giles y gestiÃ³n de backlog.', 'publico'),
(3, 'Developer full-stack con experiencia en JavaScript y bases de datos MySQL.', 'publico'),
(4, 'Developer con expertise en Node.js, Express y desarrollo backend.', 'publico');

-- Etiquetas del tablero
INSERT INTO etiqueta (nombre, color) VALUES
('Alta prioridad',  '#FF5733'),
('Bloqueada',       '#C0392B'),
('Bug',             '#E74C3C'),
('Mejora',          '#3498DB'),
('RevisiÃ³n',        '#F39C12'),
('Testing',         '#27AE60'),
('DocumentaciÃ³n',   '#9B59B6');

-- Proyecto
INSERT INTO proyecto (nombre, descripcion, tipo, estado, codigo_proyecto, creado_por) VALUES
('App Scrum', 'Sistema de gestiÃ³n de proyectos con metodologÃ­a Scrum para equipos Ã¡giles', 'Desarrollo de software', 'activo', 'SCRUM001', 2);

-- Equipo del proyecto
INSERT INTO equipo_proyecto (id_proyecto, nombre, descripcion) VALUES
(1, 'Equipo Alpha', 'Equipo principal de desarrollo del proyecto final');

-- Integrantes del equipo
INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES
(1, 1, 2),  -- Mariana: Scrum Master
(2, 1, 1),  -- SofÃ­a: Product Owner
(3, 1, 3),  -- Jefferson: Developer
(4, 1, 3);  -- Johan: Developer

-- Ã‰picas
INSERT INTO epica (id_proyecto, nombre, descripcion, categoria, prioridad, estado) VALUES
(1, 'Landing / PresentaciÃ³n', 'InformaciÃ³n de la plataforma para nuevos usuarios', 'UI', 3, 'por_hacer'),
(1, 'Registro e Inicio de SesiÃ³n', 'AutenticaciÃ³n de usuarios con email o Google', 'Seguridad', 1, 'por_hacer'),
(1, 'GestiÃ³n de Proyectos', 'Crear, configurar e ingresar a proyectos', 'Core', 1, 'por_hacer');

-- Historias de usuario
INSERT INTO historia_usuario (id_epica, nombre, como_quien, quiero, para, prioridad, story_points, estimacion_dias, estado) VALUES
(2, 'Registro de nuevo usuario', 'Usuario de la plataforma', 'registrarme con email y contraseÃ±a o con Google', 'acceder a todas las funcionalidades', 1, 3, 1.0, 'por_hacer'),
(2, 'Aceptar tÃ©rminos y condiciones', 'Usuario de la plataforma', 'ver y aceptar los tÃ©rminos durante el registro', 'conocer el uso de mis datos', 2, 1, 0.5, 'por_hacer'),
(2, 'Iniciar sesiÃ³n', 'Usuario registrado', 'iniciar sesiÃ³n con email o cuenta de Google', 'acceder al sistema', 1, 2, 1.0, 'por_hacer'),
(3, 'Crear proyecto', 'Usuario', 'crear un proyecto con nombre, descripciÃ³n y tipo', 'iniciar la gestiÃ³n de tareas en Scrum', 2, 3, 2.0, 'por_hacer');

-- Criterios de aceptaciÃ³n
INSERT INTO criterio_aceptacion (id_historia, descripcion) VALUES
(1, 'El sistema permite registro con email y contraseÃ±a, o con Google'),
(1, 'Los correos electrÃ³nicos deben ser Ãºnicos en la base de datos'),
(1, 'La contraseÃ±a debe tener mÃ­nimo 8 caracteres, un nÃºmero y una mayÃºscula'),
(2, 'Se exige aceptaciÃ³n de tÃ©rminos mediante checkbox; sin aceptarlos no se puede continuar'),
(3, 'El sistema permite inicio de sesiÃ³n con email/contraseÃ±a o Google'),
(3, 'Si Google retorna error, el sistema emite una alerta clara al usuario'),
(4, 'El formulario solicita nombre, descripciÃ³n y tipo de proyecto'),
(4, 'El proyecto se almacena y queda disponible en el listado del usuario');

-- Sprint 1
INSERT INTO sprint (id_proyecto, nombre, meta, fecha_inicio, fecha_fin, estado, velocidad_estimada) VALUES
(1, 'Sprint 1 - AutenticaciÃ³n', 'Completar mÃ³dulo de autenticaciÃ³n e inicio de sesiÃ³n', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'planeado', 9);

-- Asignar historias al sprint 1
INSERT INTO sprint_historia (id_sprint, id_historia) VALUES
(1, 1), (1, 2), (1, 3);

UPDATE historia_usuario SET id_sprint = 1 WHERE id_historia IN (1, 2, 3);

-- Tareas del sprint 1
INSERT INTO tarea (id_historia, nombre, tipo, estado, prioridad, estimacion_dias, orden_columna) VALUES
(1, 'DiseÃ±ar formulario de registro', 'RF', 'por_hacer', 'alta', 1.0, 1),
(1, 'Implementar validaciÃ³n de contraseÃ±a', 'RF', 'por_hacer', 'alta', 0.5, 2),
(1, 'IntegraciÃ³n OAuth Google', 'RF', 'por_hacer', 'alta', 1.0, 3),
(3, 'DiseÃ±ar pantalla de login', 'RF', 'por_hacer', 'alta', 0.5, 1),
(3, 'Implementar lÃ³gica de autenticaciÃ³n JWT', 'RF', 'por_hacer', 'critica', 1.0, 2);

-- Asignar tareas a usuarios
INSERT INTO tarea_usuario (id_tarea, id_usuario, es_responsable) VALUES
(1, 3, 1), (2, 3, 1), (3, 4, 1), (4, 3, 1), (5, 4, 1);

-- Etiquetas en tareas
INSERT INTO tarea_etiqueta (id_tarea, id_etiqueta) VALUES
(3, 1), (5, 1);

-- Comentarios en tareas
INSERT INTO comentario_tarea (id_tarea, id_usuario, comentario) VALUES
(1, 1, 'Validar que el diseÃ±o sea responsive (RWD)'),
(5, 2, 'Usar librerÃ­a passport.js para JWT');

-- NotificaciÃ³n de prueba
INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje) VALUES
(3, 'informativa', 'Sprint 1 iniciado', 'El Sprint 1 ha sido creado. Revisa tus tareas asignadas en el tablero.'),
(4, 'informativa', 'Sprint 1 iniciado', 'El Sprint 1 ha sido creado. Revisa tus tareas asignadas en el tablero.'),
(1, 'prioritaria', 'Nuevo sprint creado', 'Se ha creado el Sprint 1 - AutenticaciÃ³n. Comienza en 2 dÃ­as.');

-- ============================================================
-- Solicitudes de ingreso a proyecto
-- ============================================================
INSERT INTO solicitud (id_proyecto, id_usuario, mensaje_opcional, estado) VALUES
(1, 5, 'Me interesa unirme a este proyecto Scrum como Developer', 'Pendiente'),
(1, 6, 'Quiero participar en el desarrollo de la app Scrum', 'Pendiente');

-- ============================================================
-- CONSULTAS DE VERIFICACIÃ“N
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
