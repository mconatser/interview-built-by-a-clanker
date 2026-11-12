import type { FastifyInstance } from "fastify";
import { addToCartSchema, updateCartItemSchema, type Cart, type CartItem } from "@acme/shared";
import { db } from "../db.js";
import { authenticate } from "../middleware/auth.js";

function enrichCartItems(userId: string): Cart {
  const entries = db.cart.getByUserId(userId);
  const items: CartItem[] = [];
  let total = 0;

  for (const entry of entries) {
    const persona = db.personas.getById(entry.personaId);
    if (!persona) continue;

    items.push({
      id: entry.id,
      personaId: entry.personaId,
      persona,
      quantity: entry.quantity,
    });

    total += persona.price * entry.quantity;
  }

  return { items, total: Math.round(total * 100) / 100 };
}

export async function cartRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/cart", async (request) => {
    const { id: userId } = request.user as { id: string };
    return enrichCartItems(userId);
  });

  app.post("/cart", async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const parsed = addToCartSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { personaId, quantity } = parsed.data;

    const persona = db.personas.getById(personaId);
    if (!persona) {
      return reply.status(404).send({ error: "Persona not found" });
    }

    db.cart.add(userId, personaId, quantity);
    return enrichCartItems(userId);
  });

  app.put<{ Params: { itemId: string } }>(
    "/cart/:itemId",
    async (request, reply) => {
      const { id: userId } = request.user as { id: string };
      const parsed = updateCartItemSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const item = db.cart.getById(request.params.itemId);
      if (!item || item.userId !== userId) {
        return reply.status(404).send({ error: "Cart item not found" });
      }

      db.cart.update(request.params.itemId, parsed.data.quantity);
      return enrichCartItems(userId);
    }
  );

  app.delete<{ Params: { itemId: string } }>(
    "/cart/:itemId",
    async (request, reply) => {
      const { id: userId } = request.user as { id: string };
      const item = db.cart.getById(request.params.itemId);
      if (!item || item.userId !== userId) {
        return reply.status(404).send({ error: "Cart item not found" });
      }

      db.cart.remove(request.params.itemId);
      return enrichCartItems(userId);
    }
  );
}
