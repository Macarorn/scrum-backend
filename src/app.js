import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import legalRoutes from "./routes/legal.routes.js";

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
import proyectosRoutes from "./routes/proyectos.routes.js";
import sprintRoutes from "./routes/sprint.routes.js";
import tareaRoutes from "./routes/tarea.routes.js";
import usersRoutes from "./routes/users.routes.js";
import solicitudRoutes from "./routes/solicitud.routes.js";
import notificacionesRoutes from "./routes/notificaciones.routes.js";
import meetingsRoutes from "./routes/meetings.routes.js";
import { bootstrapStore } from "./utils/user.store.js";
import { initializeLegalStore } from "./utils/legal.store.js";
import { iniciarSchedulerSprint } from "./utils/sprint-scheduler.utils.js";

dotenv.config();

const app = express();
const PORT = config.server.port;

const devOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
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
    origin: corsOrigin,
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: config.rateLimit.window * 60 * 1000,
  max: config.rateLimit.max,
  message: "Demasiadas solicitudes, intenta más tarde",
  skip: (req) => req.originalUrl?.startsWith("/api/legal"),
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

import pool from "./utils/database.js";
app.get("/api/fix-encoding", async (req, res) => {
  try {
    const queries = [
      "UPDATE proyectos SET nombre = REPLACE(nombre, 'Ã³', 'ó'), descripcion = REPLACE(descripcion, 'Ã³', 'ó'), nombre = REPLACE(nombre, 'Ã¡', 'á'), descripcion = REPLACE(descripcion, 'Ã¡', 'á'), descripcion = REPLACE(descripcion, 'Ã', 'í'), descripcion = REPLACE(descripcion, 'Ã©', 'é')",
      "UPDATE epicas SET nombre = REPLACE(nombre, 'Ã³', 'ó'), descripcion = REPLACE(descripcion, 'Ã³', 'ó'), nombre = REPLACE(nombre, 'Ã¡', 'á'), descripcion = REPLACE(descripcion, 'Ã¡', 'á'), descripcion = REPLACE(descripcion, 'Ã', 'í')",
      "UPDATE sprints SET nombre = REPLACE(nombre, 'Ã³', 'ó'), objetivo = REPLACE(objetivo, 'Ã³', 'ó')",
      "UPDATE historias_usuario SET titulo = REPLACE(titulo, 'Ã³', 'ó'), descripcion = REPLACE(descripcion, 'Ã³', 'ó')",
      "UPDATE tareas SET titulo = REPLACE(titulo, 'Ã³', 'ó'), descripcion = REPLACE(descripcion, 'Ã³', 'ó')"
    ];
    for (const q of queries) {
      await pool.query(q);
    }
    res.json({ success: true, message: "Encoding fixed!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar scheduler de notificaciones de sprint
iniciarSchedulerSprint();

app.use(notFoundHandler);
app.use(errorHandler);

if (config.server.nodeEnv !== "test") {
  app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Ambiente: ${config.server.nodeEnv}`);

    // Automatic migration to ensure password_reset_token exists
    try {
        const createTable = `
          CREATE TABLE IF NOT EXISTS password_reset_token (
              id INT AUTO_INCREMENT PRIMARY KEY,
              id_usuario INT NOT NULL,
              token VARCHAR(255) NOT NULL UNIQUE,
              expira_en DATETIME NOT NULL,
              usado TINYINT(1) DEFAULT 0,
              fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
          )
        `;
        const createIndex1 = `CREATE INDEX idx_prt_token ON password_reset_token(token)`;
        const createIndex2 = `CREATE INDEX idx_prt_usuario ON password_reset_token(id_usuario)`;

        await pool.query(createTable);
        try { await pool.query(createIndex1); } catch (e) {}
        try { await pool.query(createIndex2); } catch (e) {}
        console.log('Automigrations checked/completed.');
    } catch (e) {
        console.error('Automigration failed:', e);
    }
  });
}
export default app;
