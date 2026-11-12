import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { personaRoutes } from "./routes/personas.js";
import { authRoutes } from "./routes/auth.js";
import { cartRoutes } from "./routes/cart.js";
import { favoriteRoutes } from "./routes/favorites.js";
import { checkoutRoutes } from "./routes/checkout.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});
await app.register(jwt, { secret: "agentic-personas-dev-secret" });

await app.register(personaRoutes);
await app.register(authRoutes);
await app.register(cartRoutes);
await app.register(favoriteRoutes);
await app.register(checkoutRoutes);

app.get("/health", async () => ({ status: "ok" }));

try {
  await app.listen({ port: 3001, host: "0.0.0.0" });
  console.log("API server running on http://localhost:3001");
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
