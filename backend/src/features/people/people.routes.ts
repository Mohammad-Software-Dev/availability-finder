import { Router } from "express";
import { handleGetPeople, handleGetPeopleDates } from "./people.controller.js";

const router = Router();

router.get("/people/dates", handleGetPeopleDates);
router.get("/people", handleGetPeople);

export default router;
