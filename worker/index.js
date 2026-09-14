import { hashPassword, hashSessionToken, randomToken, verifyPassword } from "./crypto.js";

const SESSION_COOKIE = "kt_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const MAX_JSON_BYTES = 160_000;
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,24}$/;
const GAME_VERSIONS = new Set(["reforged", "pokemon-z"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      if (!env.DB) return json({ error: "Base de donnees indisponible." }, 503);
      if (isMutation(request.method) && !isSameOriginRequest(request, url)) {
        return json({ error: "Requete refusee." }, 403);
      }

      const route = `${request.method} ${url.pathname}`;
      if (route === "GET /api/health") return json({ ok: true });
      if (route === "POST /api/auth/register") return register(request, env);
      if (route === "POST /api/auth/login") return login(request, env);
      if (route === "POST /api/auth/logout") return logout(request, env);
      if (route === "GET /api/auth/me") return me(request, env);
      if (route === "GET /api/teams") return listTeams(request, env);
      if (route === "POST /api/teams") return createTeam(request, env);

      const teamMatch = url.pathname.match(/^\/api\/teams\/([0-9a-f-]{36})$/i);
      if (teamMatch && request.method === "PUT") return updateTeam(request, env, teamMatch[1]);
      if (teamMatch && request.method === "DELETE") return deleteTeam(request, env, teamMatch[1]);
      return json({ error: "Route introuvable." }, 404);
    } catch (error) {
      console.error("API error", error instanceof Error ? error.message : "unknown");
      return json({ error: "Erreur interne." }, 500);
    }
  }
};

async function register(request, env) {
  const body = await readJson(request);
  const credentials = validateCredentials(body, true);
  if (credentials.error) return json({ error: credentials.error }, 400);

  const now = new Date().toISOString();
  const password = await hashPassword(credentials.password);
  const user = {
    id: crypto.randomUUID(),
    username: credentials.username,
    usernameNormalized: normalizeUsername(credentials.username)
  };

  try {
    await env.DB.prepare(
      `INSERT INTO users
       (id, username, username_normalized, password_hash, password_salt, password_algorithm, password_iterations, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PBKDF2-SHA-512', ?, ?, ?)`
    ).bind(user.id, user.username, user.usernameNormalized, password.hash, password.salt, password.iterations, now, now).run();
  } catch (error) {
    if (isUniqueConstraint(error)) return json({ error: "Ce pseudo est deja utilise." }, 409);
    throw error;
  }

  return createSessionResponse(env, request, user, 201);
}

async function login(request, env) {
  const body = await readJson(request);
  const credentials = validateCredentials(body, false);
  if (credentials.error) return json({ error: "Pseudo ou mot de passe incorrect." }, 401);

  const user = await env.DB.prepare(
    `SELECT id, username, username_normalized, password_hash, password_salt, password_iterations
     FROM users WHERE username_normalized = ?`
  ).bind(normalizeUsername(credentials.username)).first();

  const valid = user && await verifyPassword(
    credentials.password,
    user.password_salt,
    user.password_hash,
    user.password_iterations
  );
  if (!valid) return json({ error: "Pseudo ou mot de passe incorrect." }, 401);
  return createSessionResponse(env, request, user);
}

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashSessionToken(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
}

async function me(request, env) {
  const user = await requireUser(request, env);
  if (!user) return json({ user: null }, 401);
  return json({ user: publicUser(user) });
}

async function listTeams(request, env) {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const result = await env.DB.prepare(
    `SELECT id, local_id, name, game_version, team_data, created_at, updated_at
     FROM teams WHERE user_id = ? ORDER BY updated_at DESC`
  ).bind(user.id).all();
  return json({ teams: (result.results || []).map(serializeTeam) });
}

async function createTeam(request, env) {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const validated = await validatedTeamBody(request);
  if (validated.error) return json({ error: validated.error }, 400);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const row = await env.DB.prepare(
    `INSERT INTO teams (id, user_id, local_id, name, game_version, team_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, local_id) DO UPDATE SET
       name = excluded.name,
       game_version = excluded.game_version,
       team_data = excluded.team_data,
       updated_at = excluded.updated_at
     RETURNING id, local_id, name, game_version, team_data, created_at, updated_at`
  ).bind(id, user.id, validated.localId, validated.team.name, validated.team.preferredSource, validated.json, now, now).first();
  return json({ team: serializeTeam(row) }, row.id === id ? 201 : 200);
}

async function updateTeam(request, env, id) {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const validated = await validatedTeamBody(request);
  if (validated.error) return json({ error: validated.error }, 400);
  const row = await env.DB.prepare(
    `UPDATE teams SET local_id = ?, name = ?, game_version = ?, team_data = ?, updated_at = ?
     WHERE id = ? AND user_id = ?
     RETURNING id, local_id, name, game_version, team_data, created_at, updated_at`
  ).bind(validated.localId, validated.team.name, validated.team.preferredSource, validated.json, new Date().toISOString(), id, user.id).first();
  if (!row) return json({ error: "Equipe introuvable." }, 404);
  return json({ team: serializeTeam(row) });
}

async function deleteTeam(request, env, id) {
  const user = await requireUser(request, env);
  if (!user) return unauthorized();
  const result = await env.DB.prepare("DELETE FROM teams WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  if (!result.meta?.changes) return json({ error: "Equipe introuvable." }, 404);
  return new Response(null, { status: 204 });
}

async function createSessionResponse(env, request, user, status = 200) {
  const token = randomToken();
  const tokenHash = await hashSessionToken(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_DURATION_SECONDS * 1000);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).bind(tokenHash, user.id, expiresAt.toISOString(), createdAt.toISOString()).run();
  return json({ user: publicUser(user) }, status, { "Set-Cookie": sessionCookie(request, token) });
}

async function requireUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const user = await env.DB.prepare(
    `SELECT users.id, users.username
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`
  ).bind(tokenHash, new Date().toISOString()).first();
  if (!user) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  return user || null;
}

async function validatedTeamBody(request) {
  const body = await readJson(request);
  const team = body?.team;
  if (!team || typeof team !== "object" || Array.isArray(team)) return { error: "Equipe invalide." };
  const name = String(team.name || "").trim();
  if (!name || name.length > 32) return { error: "Le nom de l'equipe doit contenir entre 1 et 32 caracteres." };
  if (!GAME_VERSIONS.has(team.preferredSource)) return { error: "Version de jeu invalide." };
  if (!Array.isArray(team.pokemon) || team.pokemon.length > 6) return { error: "Une equipe peut contenir au maximum 6 Pokemon." };
  const localId = String(body.localId || team.id || "").trim();
  if (!localId || localId.length > 128) return { error: "Identifiant local invalide." };
  const normalizedTeam = { ...team, name, preferredSource: team.preferredSource };
  const data = JSON.stringify(normalizedTeam);
  if (new TextEncoder().encode(data).byteLength > MAX_JSON_BYTES) return { error: "Equipe trop volumineuse." };
  return { team: normalizedTeam, localId, json: data };
}

function validateCredentials(body, registering) {
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!USERNAME_PATTERN.test(username)) {
    return { error: registering ? "Le pseudo doit contenir 3 a 24 caracteres : lettres, chiffres, _ ou -." : "invalid" };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: registering ? "Le mot de passe doit contenir entre 8 et 128 caracteres." : "invalid" };
  }
  return { username, password };
}

function normalizeUsername(username) {
  return username.normalize("NFKC").toLowerCase();
}

function serializeTeam(row) {
  return {
    id: row.id,
    localId: row.local_id,
    name: row.name,
    gameVersion: row.game_version,
    team: JSON.parse(row.team_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function publicUser(user) {
  return { id: user.id, username: user.username };
}

async function readJson(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) return null;
  try { return await request.json(); } catch { return null; }
}

function getCookie(request, name) {
  const prefix = `${name}=`;
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) return cookie.slice(prefix.length);
  }
  return null;
}

function sessionCookie(request, token) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}`;
}

function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`;
}

function isMutation(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

function isSameOriginRequest(request, url) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return false;
  return request.headers.get("Sec-Fetch-Site") !== "cross-site";
}

function isUniqueConstraint(error) {
  return String(error?.message || error).toLowerCase().includes("unique constraint");
}

function unauthorized() {
  return json({ error: "Authentification requise." }, 401);
}

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });
}
