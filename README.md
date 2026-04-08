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

## Pruebas

```bash
npm test
```

Archivos de apoyo para pruebas manuales:

- `tests/http/auth-usuarios.rest`
- `tests/http/tareas.rest`
- `tests/http/sprints.rest`
- `tests/http/scrum-auth-usuarios.postman_collection.json`
- `tests/http/scrum-auth-usuarios.insomnia.json`

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

### Cómo validar manualmente

1. Arranca el backend con `npm run dev`.
2. Importa `tests/http/scrum-auth-usuarios.postman_collection.json` o `tests/http/scrum-auth-usuarios.insomnia.json` para auth y usuarios.
3. Usa `tests/http/tareas.rest` y `tests/http/sprints.rest` en VS Code con REST Client para tareas y sprints.
4. Obtén un token con `Auth/Login admin` y reutilízalo en `Authorization: Bearer ...`.
5. Para la demo, ejecuta en este orden: login, perfil, usuarios, épicas, historias, criterios, etiquetas, tareas y sprints.

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
