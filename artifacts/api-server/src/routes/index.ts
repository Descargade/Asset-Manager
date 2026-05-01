import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";
import activityRouter from "./activity";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tasks", tasksRouter);
router.use("/dashboard", dashboardRouter);
router.use("/activity", activityRouter);
router.use("/openai", openaiRouter);

export default router;
