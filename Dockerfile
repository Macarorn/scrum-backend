# ============================================
# Stage 1: Instalar dependencias
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# ============================================
# Stage 2: Imagen final de producción
# ============================================
FROM node:20-alpine AS production

# Metadata
LABEL maintainer="Equipo Scrum"
LABEL description="Backend API para gestión de proyectos Scrum"

WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiar dependencias de producción desde stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente y archivos necesarios
COPY package.json ./
COPY src ./src
COPY data ./data

# Cambiar permisos al usuario no-root
RUN chown -R appuser:appgroup /app

# Usar usuario no-root
USER appuser

# Exponer el puerto (por defecto 3000)
EXPOSE 3000

# Health check para monitoreo
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Comando para iniciar la aplicación
CMD ["node", "src/app.js"]
