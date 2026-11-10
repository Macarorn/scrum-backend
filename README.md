# Scrum App Backend

Sistema de gestión de proyectos Scrum con API REST en Node.js + Express

## Requisitos Previos

- Node.js v16+
- MySQL 5.7+
- npm o yarn

## Instalación

1. **Instalar dependencias**

```bash
npm install
```

2. **Configurar variables de entorno**

```bash
cp .env.example .env
# Editar .env con tus valores
```

3. **Crear base de datos**

```bash
# Ejecutar script SQL con el schema
mysql -u root < scrum_db_schema_mejorado.sql
```

4. **Iniciar servidor**

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## Usuarios de Prueba

Después de crear la base de datos con el esquema, puedes usar estos usuarios para probar el sistema:

- **sofia@gmail.com** / **Sofia1234** (Product Owner)
- **mariana@gmail.com** / **Mariana1234** (Scrum Master)
- **jefferson@gmail.com** / **Jefferson1234** (Developer)
- **johan@gmail.com** / **Johan1234** (Developer)

## Estructura del Proyecto

```
src/
├── controllers/    - Lógica de negocio
├── routes/        - Definición de rutas
├── middleware/    - Middleware personalizado
├── utils/         - Funciones utilitarias
├── validations/   - Validaciones de datos
└── app.js         - Archivo principal
```
### Módulo: Criterios de Aceptación

Este módulo se encarga de las condiciones que validan una Historia de Usuario.

`PUT /api/criterios/:id`    - Actualizar criterio - Product Owner, Scrum Master 
`DELETE /api/criterios/:id` - Eliminar criterio   - Product Owner, Scrum Master 


### Módulo: Autenticación

Gestiona el acceso, registro y seguridad de las sesiones de usuario.

Método | Endpoint              | Descripción                                | Seguridad           
------ | -------------------   | ------------------------------------------ | ------------------- 
 
`POST /api/auth/register` - Crea una nueva cuenta de usuario - Publico             
`POST /api/auth/login` - Valida credenciales y entrega un token - JWT Publico             
`POST /api/auth/logout` - Invalida la sesion actual del usuario - Usuario Autenticado 
`POST /api/auth/refresh-token`- Genera un nuevo token de acceso - Usuario Autenticado 


### Modulo: Usuarios y Perfil

Gestiona la administracion de cuentas, roles u control de acceso al sistema


`GET  /api/perfil` - Obtiene la informacion del perfil propio - Usuario Autenticado 
`PUT  /api/perfil`  - Actualia la informacion del perfil propio - Usuario Autenticado 
`GET  /api/usuarios` - Lista todos los usuarios del sistema - Admin 
`GET  /api/usuarios/id:`- Obtiene el detalle de un usuario especifico - Admin o propietario del recurso 
`PUT  /api/usuarios/id:` - Actualiza los datos de un usurio especifico - Admin o propietario del recurso 
`DELETE  /api/usuarios/id:` - Elimina un usuario del sistema - Permiso: usuarios: delete 
`POST /api/usuarios/:id/asignar-rol` - Cambia o asigna un rol a un usuario - Permiso: roles: assign 
`GET  /api/roles` - Lista todos los roles disponibles - Admin 
`GET  /api/permisos ` - Lista todos los permisos configurados - Admin 


### Módulo: Proyectos

Gestión y administración de los espacios de trabajo Scrum.

`GET /api/proyectos` - Lista los proyectos asociados al usuario actual - Usuario Autenticado 
`GET  /api/proyectos/todos` - Lista la totalidad de proyectos en el sistema - Usuario Autenticado 
`POST  /api/proyectos`- Crea un nuevo proyecto en la plataforma - Product Owner, Scrum Master, Usuario 
`GET /api/proyectos/codigo/:codigo`- Busca un proyecto especifico mediante su codigo unico - Usuario Autenticado 
`POST /api/proyectos/:id/unirse`- Permite a un usuario vincularse a un proyecto existente - Usuario Autenticado 
`GET  /api/proyectos/:id`- Obtiene la informacion detallada de un proyecto por su ID - Usuario Autenticado 
`PUT  /api/proyectos/:id`- Actualizar los datos generales de un proyecto - Product Owner, Scrum Master, Usuario 
`DELETE /api/proyectos/:id`- Eliminar un proyecto de forma permanente - Product Owner, Scrum Master, Usuario 
`GET /api/proyectos/:id/export`- Exportar datos de un proyecto a Excel de forma ordenada - Product Owner, Scrum Master


### Épicas

Gestión de grandes bloques de funcionalidades (Épicas) dentro del backlog.

`GET /api/epicas` - Lista todas las epicas registradas - Usuario Autenticado 
`POST /api/epicas` - Crea una nueva epica  - Product Owner, Scrum Master, Usuario 
`GET /api/epicas/:id`- Obtiene el detalle de una epica especifica - Usuario Autenticado 
`PUT /api/epicas/:id`- Actualiza la informacion de una epica existente - Product Owner, Scrum Master, Usuario 
`DELETE /api/epicas/:id`- Elimina una epica del sistema - Product Owner, Scrum Master, Usuario 


### Módulo: Etiquetas

Clasificación y categorización de elementos del proyecto (ej: Frontend, Bug, Urgente).

`GET /api/etiquetas` - Lista todas las etiquetas disponibles - Usuario Autenticado 
`POST /api/etiquetas`- Crea una nueva etiqueta categorizada - Product Owner, Scrum Master, Usuario 
`PUT /api/etiquetas/:id`- Actualiza el nombre o color de una etiqueta - Product Owner, Scrum Master, Usuario 
`DELETE /api/etiquetas/:id` - Elimina una etiqueta de forma permanente - Product Owner, Scrum Master, Usuario 


### Módulo: Sprints

Gestión de ciclos de trabajo e iteraciones del proyecto.


`GET /api/sprints` -Lista todas los sprints programados - Protegido (JWT)* 
`POST /api/sprints` - Crea una nuevo sprint  - Protegido (JWT)* 
`GET /api/sprints/:id` - Obtiene el detalle de un sprint especifico - Protegido (JWT)* 
`PUT /api/sprints/:id` - Actualiza la informacion de un sprint - Protegido (JWT)* 
`DELETE /api/sprints/:id` - Elimina un sprint del cronograma - Protegido (JWT)* 
`PATCH /api/sprints/:id/estado` - Cambia el estado del sprint (ej: Planeacion, Activo, Cerrado) - Protegido(JWT)* 

### Módulo: Tareas (Sprint Backlog)
Gestión operativa del trabajo diario, seguimiento de tiempos y colaboración.


`GET /api/tareas` - Lista todas las tareas del sprint - Usuario Autenticado 
`POST /api/tareas` - Crea una nueva tarea en el backlog - Usuario Autenticado 
`GET /api/tareas/:id` - Obtiene el detalle de una tarea - Usuario Autenticado 
`PUT /api/tareas/:id` - Actualiza la informacion tecnica de la tarea - Usuario Autenticado 
`DELETE /api/tareas/:id` - Elimina una tarea del sistema - Usuario Autenticado 
`PATCH /api/tareas/:id/estado` -Cambia el estado (Kanban) de la tarea - Solo asignadas + validar flujo  
`PUT /api/tareas/:id/orden`- Reorganiza la posicion (Drag & Drop) - Usuario Autenticado 
`PATCH /api/tareas/:id/tiempo-real`- Registra horas invertidas en la tarea - Solo el responsable 
`POST /api/tareas/:id/asignar` - Vincula a un desarrollador a la tarea - Usuario Autenticado 
`DELETE /api/tareas/:id/asignar/:userld` - Remueve a un usuario de la tarea - Usuario Autenticado 
`GET /api/tareas/:id/historial ` - Consulta la trazabilidad de cambios - Usuario Autenticado 
`POST /api/tareas/:id/comentarios` - Añadir feedback o notas a la tarea - Usuario Autenticado 
`POST /api/tareas/:id/etiquetas ` - Vincular una etiqueta (Tag) a la tarea - Usuario Autenticado 


### Módulo: Historias de Usuario

Gestión del Product Backlog y definición de requerimientos detallados.


`GET /api/historias` - Lista todas las historias de usuario - Usuario Autenticado 
`POST /api/historias`- Crea una nueva historia en el backlog - Product Owner, Scrum Master, Usuario 
`GET /api/historias/:id` - Obtiene el detalle de una historia especifica - Usuario Autenticado 
`PUT /api/historias/:id`- Actualiza los datos de una historia - Product Owner, Scrum Master, Usuario 
`DELETE /api/historias/:id` - Elimina una historia del backlog - Product Owner, Scrum Master, Usuario 
`GET /api/historias/:id/criterios` - Lista los criterios de una historia especifica - Usuario Autenticado 
`POST /api/historias/:id/criterios` - Crea un criterio vinculado a una historia - Product Owner, Scrum Master, Usuario 


## Endpoints Principales

### Autenticación

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/refresh-token` - Refrescar access token

### Usuarios y Perfil

- `GET /api/usuarios` - Listar usuarios (admin)
- `GET /api/usuarios/:id` - Obtener usuario por id
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario
- `POST /api/usuarios/:id/asignar-rol` - Asignar rol a usuario
- `GET /api/roles` - Listar roles
- `GET /api/permisos` - Listar permisos
- `GET /api/perfil` - Obtener mi perfil
- `PUT /api/perfil` - Actualizar mi perfil

### Solicitudes y Notificaciones

- `POST /api/solicitudes` - Crear solicitud de ingreso a un proyecto
- `GET /api/solicitudes` - Listar mis solicitudes
- `GET /api/solicitudes/pendientes?proyecto=:id` - Listar solicitudes pendientes de un proyecto
- `POST /api/solicitudes/:id_solicitud/aprobar` - Aprobar una solicitud
- `POST /api/solicitudes/:id_solicitud/rechazar` - Rechazar una solicitud
- `GET /api/notificaciones` - Listar notificaciones del usuario autenticado
- `POST /api/notificaciones/:id_notificacion/leida` - Marcar notificación como leída

## Pruebas

```bash
npm test
```

Archivos de apoyo para pruebas manuales:

- `tests/http/scrum-auth-usuarios.postman_collection.json`
- `tests/http/scrum-auth-usuarios.insomnia.json`
- `tests/http/scrum-backend-demo-completo.postman_collection.json`
- `tests/http/scrum-backend-demo-completo.insomnia.json`

### Flujo de prueba en Insomnia

1. Importa `tests/http/scrum-auth-usuarios.insomnia.json`.
2. Ejecuta `Login Admin`.
3. Copia `data.accessToken` y `data.refreshToken` en el environment si no deseas usar variables manuales.
4. Usa el header `Authorization: Bearer <token>` en las peticiones protegidas.
5. Prueba primero `GET /api/perfil`, luego `GET /api/usuarios` y por último `POST /api/usuarios/:id/asignar-rol`.

### Cobertura actual

- `auth-users.test.js`: auth, usuarios, perfil, roles, permisos y flujo de tokens.
- `backlog.test.js`: épicas, historias, criterios y etiquetas.
- `tareas.test.js`: CRUD de tareas más estado, orden, tiempo real, comentarios, etiquetas, historial y asignación, usando nombres alineados con `tarea`.
- `sprints.test.js`: CRUD de sprints y cambio de estado con DB simulada, usando nombres alineados con `sprint`.

### Escenarios E2E de integración

- Usuario solicita ingreso a un proyecto desde el frontend.
- El aprobador ve la solicitud en el centro de notificaciones y la aprueba o rechaza.
- El usuario consulta el estado actualizado de su solicitud y recibe la notificación correspondiente.
- El frontend refresca el centro de notificaciones de forma periódica para simular tiempo real.

### Defectos observados en validación

- `npm test` actualmente falla en `tests/integration/tareas.test.js` por errores heredados de ids `undefined`/`NaN` en la capa de tareas.
- La misma corrida muestra fallos de autenticación en `tests/integration/auth-users.test.js` por credenciales o semilla no alineadas en ese entorno.
- Estos fallos no pertenecen al flujo de notificaciones integrado en esta entrega.

### Cómo validar manualmente

1. Arranca el backend con `npm run dev`.
2. Importa `tests/http/scrum-auth-usuarios.postman_collection.json` o `tests/http/scrum-auth-usuarios.insomnia.json` para auth y usuarios.
3. Para demo completa, usa `tests/http/scrum-backend-demo-completo.postman_collection.json` o `tests/http/scrum-backend-demo-completo.insomnia.json`.
4. Obtén un token con `Auth/Login admin`, `Auth/Login Product Owner` o `Auth/Login Scrum Master` y reutilízalo en `Authorization: Bearer ...`.
5. Para la demo, ejecuta en este orden: login, perfil, usuarios, épicas, historias, criterios, etiquetas, tareas, sprints y logout.

### Colección Unificada De Demo

- Postman: `tests/http/scrum-backend-demo-completo.postman_collection.json`
- Insomnia: `tests/http/scrum-backend-demo-completo.insomnia.json`
- Recomendación de flujo: `Login Admin` (solo para usuarios/roles) -> `Login Product Owner` o `Login Scrum Master` (para backlog) -> `Sprints` -> `Tareas` -> `Logout`.

Credenciales semilla para demo:

- Admin: `admin@scrum.local` / `Admin1234`
- Product Owner: `sofia@scrum.local` / `Sofia1234`
- Scrum Master: `mariana@scrum.local` / `Mariana1234`

### Alineación con el esquema

- `tarea` usa `id_tarea`, `id_historia`, `nombre`, `tipo`, `estado`, `prioridad`, `story_points`, `estimacion_dias`, `tiempo_real` y `orden_columna`.
- `sprint` usa `id_sprint`, `id_proyecto`, `nombre`, `meta`, `fecha_inicio`, `fecha_fin`, `estado`, `velocidad_estimada`, `velocidad_real` y `fecha_liberacion`.
- Los archivos manuales y las pruebas ya usan esos nombres para que coincidan con el SQL.

## Seguridad

- JWT para autenticación
- Bcrypt para hashing de contraseñas
- CORS configurado
- Helmet para headers seguros
- Rate limiting en endpoints

## Equipo

- **Mariana Ríos**
- **Johan Dejesus**
- **Sofía Bonilla**
- **Jefferson Pineda**
- **Felipe Giraldo**
