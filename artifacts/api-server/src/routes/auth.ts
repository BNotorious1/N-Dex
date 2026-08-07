import { Router } from "express";
import { logger } from "../lib/logger";
import { db, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DISCORD_CLIENT_ID = process.env["DISCORD_CLIENT_ID"] ?? "";
const DISCORD_CLIENT_SECRET = process.env["DISCORD_CLIENT_SECRET"] ?? "";

function getRedirectUri() {
  const domain =
    process.env["DISCORD_REDIRECT_BASE"] ??
    process.env["REPLIT_DOMAINS"]?.split(",")[0] ??
    process.env["REPLIT_DEV_DOMAIN"];

  if (domain) {
    return `https://${domain}/api/auth/discord/callback`;
  }

  throw new Error(
    "Cannot determine callback URI: set DISCORD_REDIRECT_BASE, or ensure REPLIT_DOMAINS / REPLIT_DEV_DOMAIN is available.",
  );
}

// GET /api/auth/discord
router.get("/discord", (req, res) => {
  let redirectUri: string;
  try {
    redirectUri = getRedirectUri();
  } catch (err) {
    logger.error({ err }, "Could not determine Discord redirect URI");
    res.redirect("/?auth=error&reason=config");
    return;
  }

  // Store returnTo in session so callback can redirect back after login
  const returnTo = req.query["returnTo"] as string | undefined;
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    req.session.returnTo = returnTo;
  }

  logger.info({ redirectUri }, "Initiating Discord OAuth");

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

// GET /api/auth/discord/callback
router.get("/discord/callback", async (req, res) => {
  const code = req.query["code"] as string | undefined;
  const error = req.query["error"] as string | undefined;

  if (error) {
    logger.warn({ error }, "Discord OAuth returned an error");
    res.redirect(`/?auth=error&reason=${encodeURIComponent(error)}`);
    return;
  }

  if (!code) {
    res.redirect("/?auth=error&reason=no_code");
    return;
  }

  try {
    const redirectUri = getRedirectUri();

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "");
      logger.error({ status: tokenRes.status, body }, "Discord token exchange failed");
      res.redirect("/?auth=error&reason=token");
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      logger.error({ status: userRes.status }, "Discord user fetch failed");
      res.redirect("/?auth=error&reason=user");
      return;
    }

    const user = (await userRes.json()) as {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      email?: string;
      global_name?: string | null;
    };

    const displayName =
      user.global_name ??
      (user.discriminator !== "0" ? `${user.username}#${user.discriminator}` : user.username);

    req.session.user = {
      id: user.id,
      username: user.username,
      displayName,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      email: user.email,
    };

    // Backfill avatar URL on any member rows matching this username
    if (req.session.user.avatar) {
      db.update(membersTable)
        .set({ discordAvatarUrl: req.session.user.avatar })
        .where(eq(membersTable.discordName, user.username))
        .catch((err) => logger.warn({ err }, "Failed to backfill member avatar"));
    }

    const returnTo = req.session.returnTo;
    delete req.session.returnTo;

    req.session.save((err) => {
      if (err) {
        logger.error({ err }, "Session save failed after Discord auth");
        res.redirect("/?auth=error&reason=session");
        return;
      }
      res.redirect(returnTo ?? "/leagues");
    });
  } catch (err) {
    logger.error({ err }, "Discord auth callback error");
    res.redirect("/?auth=error&reason=exception");
  }
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

export default router;
