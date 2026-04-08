import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error-handler.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import epicasRoutes from "./routes/epicas.routes.js";
import historiasRoutes from "./routes/historias.routes.js";
import criteriosRoutes from "./routes/criterios.routes.js";
import etiquetasRoutes from "./routes/etiquetas.routes.js";
import sprintRoutes from "./routes/sprint.routes.js";
import { bootstrapStore } from "./utils/user.store.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

await bootstrapStore();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true,
  }),
);

app.use(requestLogger);

app.use(
  "/api/",
  rateLimit({
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  }),
);

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
      epicas: "/api/epicas",
      historias: "/api/historias",
      criterios: "/api/criterios",
      etiquetas: "/api/etiquetas",
      sprints: "/api/sprints",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", usersRoutes);
app.use("/api/epicas", epicasRoutes);
app.use("/api/historias", historiasRoutes);
app.use("/api/criterios", criteriosRoutes);
app.use("/api/etiquetas", etiquetasRoutes);
app.use("/api/sprints", sprintRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV}`);
  });
}

export default app;
