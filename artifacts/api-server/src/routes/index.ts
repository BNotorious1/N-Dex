import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leaguesRouter from "./leagues";
import teamsRouter from "./teams";
import playersRouter from "./players";
import gamesRouter from "./games";
import importRouter from "./import";
import eaRouter from "./ea";
import proxyRouter from "./proxy";
import authRouter from "./auth";
import storageRouter from "./storage";
import invitesRouter from "./invites";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(storageRouter);
router.use("/leagues", leaguesRouter);
router.use("/leagues/:id/ea", eaRouter);
router.use("/teams", teamsRouter);
router.use("/players", playersRouter);
router.use("/games", gamesRouter);
router.use("/import", importRouter);
router.use(invitesRouter);
router.use(proxyRouter);

export default router;
