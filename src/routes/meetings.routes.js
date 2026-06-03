import express from "express";
import * as controller from "../controllers/meetings.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireProjectMember, requireRole } from "../middleware/authorization.middleware.js";

const router = express.Router();
const useAuth = process.env.USE_AUTH === "true";
const protect = useAuth ? authMiddleware : (req, res, next) => next();

// Roles permitidos para gestionar reuniones
const canManageMeetings = useAuth ? [protect, requireRole(["Product Owner", "Scrum Master"])] : (req, res, next) => next();

router.get("/", protect, controller.getMeetings);
router.get("/project/:idProyecto", protect, requireProjectMember(), controller.getMeetingsByProject);
router.post("/", canManageMeetings, controller.createMeeting);
router.put("/:id", canManageMeetings, controller.updateMeeting);
router.delete("/:id", canManageMeetings, controller.deleteMeeting);

export default router;
