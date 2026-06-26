import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

console.log(`Intentando cargar .env desde: ${envPath}`);

// Validar que las variables necesarias estén cargadas
const requiredVars = [
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
  "DB_PORT",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];

const missingVars = requiredVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(`Variables de entorno faltantes: ${missingVars.join(", ")}`);
}

export default {
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || "1h",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || "7d",
  },
  mongo: {
    uri: process.env.MONGO_URI,
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || "").split(",").filter(Boolean),
  },
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  },
};
