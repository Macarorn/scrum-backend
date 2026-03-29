import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import sprintRoutes from "./routes/sprint.routes.js";
import authRoutes from "./routes/auth.routes.js";

import { requestLogger } from "./middleware/request-logger.middleware.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error-handler.middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


// 🔥 1. PARSEO (PRIMERO SIEMPRE)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 🔥 2. SEGURIDAD
app.use(helmet());
app.use(cors());


// 🔥 3. LOGGER
app.use(requestLogger);


// 🔥 4. RATE LIMIT (SIN .env por ahora)
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);


// 🔥 5. RUTAS (UNA SOLA VEZ)
app.use("/api/sprints", sprintRoutes);
app.use("/api/auth", authRoutes);


// 🔥 TEST
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API funcionando ✅",
  });
});


// 🔥 ERRORES
app.use(notFoundHandler);
app.use(errorHandler);


// 🔥 SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});