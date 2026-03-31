import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

// Middleware personalizado
import { requestLogger } from "./middleware/request-logger.middleware.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error-handler.middleware.js";

// Rutas
import authRoutes from "./routes/auth.routes.js";
import epicasRoutes from "./routes/epicas.routes.js";
import historiasRoutes from "./routes/historias.routes.js";
import criteriosRoutes from "./routes/criterios.routes.js";
import etiquetasRoutes from "./routes/etiquetas.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARES GLOBALES


// Seguridad
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: "Demasiadas solicitudes, intenta más tarde",
});
app.use("/api/", limiter);

// Parseo de datos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use(requestLogger);

// RUTAS

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Scrum App API - Backend funcionando ✅",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      usuarios: "/api/usuarios",
      backlog: "/api/backlog",
      sprints: "/api/sprints",
      tareas: "/api/tareas",
    },
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/epicas", epicasRoutes);
app.use("/api/historias", historiasRoutes);
app.use("/api/criterios", criteriosRoutes);
app.use("/api/etiquetas", etiquetasRoutes);


// MANEJO DE ERRORES

app.use(notFoundHandler);
app.use(errorHandler);

// INICIAR SERVIDOR

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV}`);
});
