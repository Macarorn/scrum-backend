import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// Cargar configuración primero
import config from "./config/config.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error-handler.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import criteriosRoutes from "./routes/criterios.routes.js";
import epicasRoutes from "./routes/epicas.routes.js";
import etiquetasRoutes from "./routes/etiquetas.routes.js";
import historiasRoutes from "./routes/historias.routes.js";
import legalRoutes from "./routes/legal.routes.js";
import meetingsRoutes from "./routes/meetings.routes.js";
import notificacionesRoutes from "./routes/notificaciones.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import proyectosRoutes from "./routes/proyectos.routes.js";
import solicitudRoutes from "./routes/solicitud.routes.js";
import sprintRoutes from "./routes/sprint.routes.js";
import tareaRoutes from "./routes/tarea.routes.js";
import usersRoutes from "./routes/users.routes.js";
import metricasRoutes from "./routes/metricas.routes.js";
import { bootstrapStore } from "./utils/user.store.js";
import { initializeLegalStore } from "./utils/legal.store.js";
import { iniciarSchedulerSprint } from "./utils/sprint-scheduler.utils.js";
import documentosRoutes from "./routes/documentos.routes.js";
import pool from "./utils/database.js";

dotenv.config();

const app = express();
const PORT = config.server.port;

const devOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175", "http://127.0.0.1:5175"];
const allowedOrigins =
  config.server.nodeEnv === "development"
    ? Array.from(new Set([...config.cors.origin, ...devOrigins]))
    : config.cors.origin;

const corsOrigin =
  allowedOrigins.length === 0
    ? true
    : (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      };

await bootstrapStore();
await initializeLegalStore();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Trust the first proxy (e.g. DigitalOcean App Platform) for rate limiting
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: config.rateLimit.window * 60 * 1000,
  max: config.rateLimit.max,
  message: "Demasiadas solicitudes, intenta más tarde",
  skip: (req) => 
    process.env.NODE_ENV === "development" || 
    process.env.NODE_ENV === "test" || 
    req.originalUrl?.startsWith("/api/legal"),
});
app.use("/api/", limiter);

app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Scrum App API - Backend funcionando",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      usuarios: "/api/usuarios",
      perfil: "/api/perfil",
      roles: "/api/roles",
      permisos: "/api/permisos",
      proyectos: "/api/proyectos",
      epicas: "/api/epicas",
      historias: "/api/historias",
      criterios: "/api/criterios",
      etiquetas: "/api/etiquetas",
      sprints: "/api/sprints",
      tareas: "/api/tareas",
      meetings: "/api/meetings",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", usersRoutes);
app.use("/api/meetings", meetingsRoutes);
app.use("/api/metricas", metricasRoutes);
app.use("/api/v1/metricas", metricasRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/proyectos", proyectosRoutes);
app.use("/api/epicas", epicasRoutes);
app.use("/api/historias", historiasRoutes);
app.use("/api/criterios", criteriosRoutes);
app.use("/api/etiquetas", etiquetasRoutes);
app.use("/api/sprints", sprintRoutes);
app.use("/api/tareas", tareaRoutes);
app.use("/api/solicitudes", solicitudRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/legal", legalRoutes);
app.use("/api/proyectos/:id_proyecto/documentos", documentosRoutes);

// Iniciar scheduler de notificaciones de sprint
iniciarSchedulerSprint();

app.use(notFoundHandler);
app.use(errorHandler);

let server;

if (config.server.nodeEnv !== "test") {
  server = app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Ambiente: ${config.server.nodeEnv}`);

    try {
      // documento_proyecto
      await pool.query(`
        CREATE TABLE IF NOT EXISTS documento_proyecto (
            id_documento INT AUTO_INCREMENT PRIMARY KEY,
            id_proyecto INT NOT NULL,
            nombre VARCHAR(255) NOT NULL,
            tipo_archivo VARCHAR(10) NOT NULL,
            estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
            version_actual INT NOT NULL DEFAULT 1,
            id_usuario_creador INT NOT NULL,
            fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            id_usuario_modificacion INT NULL,
            fecha_modificacion DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE,
            FOREIGN KEY (id_usuario_creador) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
            FOREIGN KEY (id_usuario_modificacion) REFERENCES usuario(id_usuario) ON DELETE SET NULL
        )
      `);
      try { await pool.query(`CREATE INDEX idx_doc_proyecto ON documento_proyecto(id_proyecto)`); } catch (e) {}
      try { await pool.query(`CREATE INDEX idx_doc_estado ON documento_proyecto(estado)`); } catch (e) {}

      // documento_version
      await pool.query(`
        CREATE TABLE IF NOT EXISTS documento_version (
            id_version INT AUTO_INCREMENT PRIMARY KEY,
            id_documento INT NOT NULL,
            numero_version INT NOT NULL,
            nombre_archivo VARCHAR(255) NOT NULL,
            r2_key VARCHAR(500) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            tamano_bytes BIGINT NOT NULL,
            comentario TEXT NOT NULL,
            id_usuario INT NOT NULL,
            fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_documento) REFERENCES documento_proyecto(id_documento) ON DELETE CASCADE,
            FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
        )
      `);
      try { await pool.query(`CREATE INDEX idx_docver_documento ON documento_version(id_documento)`); } catch (e) {}
      try { await pool.query(`ALTER TABLE documento_version ADD UNIQUE KEY uk_doc_version (id_documento, numero_version)`); } catch (e) {}
      try { await pool.query(`ALTER TABLE usuario ADD COLUMN is_verified TINYINT(1) DEFAULT 0`); } catch (e) {}
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_verification_token (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_usuario INT NOT NULL,
          token VARCHAR(255) NOT NULL,
          usado TINYINT(1) DEFAULT 0,
          creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
          expira_en DATETIME NOT NULL,
          FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_token (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_usuario INT NOT NULL,
          token VARCHAR(255) NOT NULL,
          usado TINYINT(1) DEFAULT 0,
          creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
          expira_en DATETIME NOT NULL,
          FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
        )
      `);

      // Clean up Cypress test garbage data that was in the DB dump
      try {
        await pool.query(`DELETE FROM meeting WHERE title LIKE '%Cypress%' OR description LIKE '%Cypress%'`);
        console.log('Cypress test data cleaned up.');
      } catch (e) {}

      console.log('Automigrations checked/completed.');
    } catch (e) {
      console.error('Automigration for documents failed:', e);
    }
  });

  // Manejo graceful shutdown para evitar que el puerto quede ocupado
  const gracefulShutdown = (signal) => {
    console.log(`\nRecibida señal ${signal}. Cerrando servidor...`);
    server.close(() => {
      console.log('Servidor cerrado correctamente');
      process.exit(0);
    });

    // Forzar cierre después de 10 segundos si no se cierra
    setTimeout(() => {
      console.error('Forzando cierre del servidor...');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}
export default app;
