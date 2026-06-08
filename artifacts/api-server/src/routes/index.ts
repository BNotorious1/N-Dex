import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leaguesRouter from "./leagues";
import teamsRouter from "./teams";
import playersRouter from "./players";
import gamesRouter from "./games";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/leagues", leaguesRouter);
router.use("/teams", teamsRouter);
router.use("/players", playersRouter);
router.use("/games", gamesRouter);

export default router;
