import express from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  skip: (req) => process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test",
  message: {
    success: false,
    error: "TOO_MANY_REQUESTS",
    message: "Demasiados intentos de login. Intenta más tarde",
    details: {},
  },
});

router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/verify-email", authController.verifyEmail);

// Nuevos endpoints para términos y consentimiento
router.get("/legal/terms", authController.getTerms);
router.get("/users/:id/consent", authMiddleware, authController.getUserConsent);

export default router;
