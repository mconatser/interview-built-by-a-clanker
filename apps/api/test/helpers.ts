import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { personaRoutes } from "../src/routes/personas.js";
import { authRoutes } from "../src/routes/auth.js";
import { cartRoutes } from "../src/routes/cart.js";
import { favoriteRoutes } from "../src/routes/favorites.js";
import { checkoutRoutes } from "../src/routes/checkout.js";

// Same plugins and routes as src/index.ts, without listen(). The db is module state,
// and vitest isolates each test file, so every file starts from the seed data.
export async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(jwt, { secret: "test-secret" });
  await app.register(personaRoutes);
  await app.register(authRoutes);
  await app.register(cartRoutes);
  await app.register(favoriteRoutes);
  await app.register(checkoutRoutes);
  await app.ready();
  return app;
}

let seq = 0;
export async function registerUser(app: Awaited<ReturnType<typeof buildTestApp>>) {
  const n = ++seq;
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { username: `user${n}`, email: `user${n}@example.com`, password: "password123" },
  });
  const body = res.json() as { token: string; user: { id: string } };
  return { token: body.token, userId: body.user.id, auth: { authorization: `Bearer ${body.token}` } };
}
