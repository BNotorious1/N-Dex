import { Router } from "express";
import { db, membersTable, leaguesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const DISCORD_CLIENT_ID = process.env["DISCORD_CLIENT_ID"] ?? "";
const DISCORD_CLIENT_SECRET = process.env["DISCORD_CLIENT_SECRET"] ?? "";

function getRedirectUri(req: { headers: { host?: string; "x-forwarded-proto"?: string; "x-forwarded-host"?: string } }) {
  const forwardedHost = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  return `${proto}://${host}/api/auth/discord/callback`;
}

// GET /api/auth/discord
router.get("/discord", (req, res) => {
  const redirectUri = getRedirectUri(req);
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
  if (!code) {
    res.redirect("/?auth=error");
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);

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
      logger.error({ status: tokenRes.status }, "Discord token exchange failed");
      res.redirect("/?auth=error");
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      res.redirect("/?auth=error");
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

    const displayName = user.global_name ?? (user.discriminator !== "0" ? `${user.username}#${user.discriminator}` : user.username);

    req.session.user = {
      id: user.id,
      username: user.username,
      displayName,
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
      email: user.email,
    };

    res.redirect("/leagues");
  } catch (err) {
    logger.error({ err }, "Discord auth callback error");
    res.redirect("/?auth=error");
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
