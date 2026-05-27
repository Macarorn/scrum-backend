import { Router } from "express";
import { getTerms, acceptTerms } from "../controllers/legal.controller.js";

const router = Router();

router.get("/terms", getTerms);
router.post("/accept", acceptTerms);

export default router;
