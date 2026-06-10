import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leaguesRouter from "./leagues";
import teamsRouter from "./teams";
import playersRouter from "./players";
import gamesRouter from "./games";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/leagues", leaguesRouter);
router.use("/teams", teamsRouter);
router.use("/players", playersRouter);
router.use("/games", gamesRouter);
router.use("/import", importRouter);

export default router;
