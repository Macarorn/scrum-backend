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

(Más endpoints en desarrollo...)

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
