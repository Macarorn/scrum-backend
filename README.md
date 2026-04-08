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
- `tests/http/scrum-auth-usuarios.postman_collection.json`
- `tests/http/scrum-auth-usuarios.insomnia.json`

### Flujo de prueba en Insomnia

1. Importa `tests/http/scrum-auth-usuarios.insomnia.json`.
2. Ejecuta `Login Admin`.
3. Copia `data.accessToken` y `data.refreshToken` en el environment si no deseas usar variables manuales.
4. Usa el header `Authorization: Bearer <token>` en las peticiones protegidas.
5. Prueba primero `GET /api/perfil`, luego `GET /api/usuarios` y por último `POST /api/usuarios/:id/asignar-rol`.

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
