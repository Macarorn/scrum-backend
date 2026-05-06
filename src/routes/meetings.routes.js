import express from "express";
import * as controller from "../controllers/meetings.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();
const useAuth = process.env.USE_AUTH === "true";
const protect = useAuth ? authMiddleware : (req, res, next) => next();

router.get("/", protect, controller.getMeetings);
router.post("/", protect, controller.createMeeting);
router.delete("/:id", protect, controller.deleteMeeting);

export default router;
