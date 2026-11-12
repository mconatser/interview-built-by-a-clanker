import type { Persona, User, CartItem, Order } from "@acme/shared";

interface StoredUser extends User {
  passwordHash: string;
}

interface CartEntry {
  id: string;
  userId: string;
  personaId: string;
  quantity: number;
}

export const personas = new Map<string, Persona>();
const users = new Map<string, StoredUser>();
export const cartItems = new Map<string, CartEntry>();
export const favorites = new Map<string, Set<string>>(); // userId -> Set<personaId>
const orders = new Map<string, Order>();

let cartItemCounter = 0;
let orderCounter = 0;

function nextCartItemId(): string {
  return `cart-${++cartItemCounter}`;
}

function nextOrderId(): string {
  return `order-${++orderCounter}`;
}

const seedPersonas: Persona[] = [
  {
    id: "p-001",
    name: "Refactor Rex",
    tagline: "Your relentless code reviewer",
    description:
      "Refactor Rex dives deep into your codebase, identifying code smells, reducing complexity, and suggesting clean architectural patterns. Ideal for legacy codebases that need modernization.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Rex",
    specialty: "Engineering",
    capabilities: [
      "Code review",
      "Complexity analysis",
      "Design patterns",
      "Technical debt reduction",
    ],
    price: 49.99,
    rating: 4.8,
    reviewCount: 234,
    tier: "Pro",
  },
  {
    id: "p-002",
    name: "Zero-Day Zara",
    tagline: "Security auditor with a sixth sense",
    description:
      "Zero-Day Zara performs thorough security audits across your entire stack. From SQL injection to XSS vulnerabilities, she catches what others miss before attackers do.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Zara",
    specialty: "Security",
    capabilities: [
      "Vulnerability scanning",
      "Penetration testing",
      "OWASP compliance",
      "Security best practices",
    ],
    price: 89.99,
    rating: 4.9,
    reviewCount: 187,
    tier: "Enterprise",
  },
  {
    id: "p-003",
    name: "Pipeline Pete",
    tagline: "CI/CD maestro extraordinaire",
    description:
      "Pipeline Pete automates your entire deployment pipeline. From build optimization to multi-environment deployments, Pete ensures your code ships fast and reliably.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Pete",
    specialty: "DevOps",
    capabilities: [
      "CI/CD pipelines",
      "Docker orchestration",
      "Infrastructure as code",
      "Monitoring setup",
    ],
    price: 59.99,
    rating: 4.6,
    reviewCount: 312,
    tier: "Pro",
  },
  {
    id: "p-004",
    name: "Pixel Perfect Priya",
    tagline: "Design systems whisperer",
    description:
      "Priya transforms vague design briefs into pixel-perfect component libraries. She ensures consistency, accessibility, and visual harmony across your entire product.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Priya",
    specialty: "Design",
    capabilities: [
      "Design systems",
      "Component libraries",
      "Accessibility audits",
      "Responsive design",
    ],
    price: 54.99,
    rating: 4.7,
    reviewCount: 156,
    tier: "Pro",
  },
  {
    id: "p-005",
    name: "Query Quinn",
    tagline: "Database whisperer and query optimizer",
    description:
      "Query Quinn analyzes your database queries, identifies N+1 problems, suggests optimal indexing strategies, and rewrites slow queries for maximum performance.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Quinn",
    specialty: "Data",
    capabilities: [
      "Query optimization",
      "Index strategy",
      "Schema design",
      "Migration planning",
    ],
    price: 69.99,
    rating: 4.5,
    reviewCount: 203,
    tier: "Pro",
  },
  {
    id: "p-006",
    name: "Scope Creep Sam",
    tagline: "Product manager who keeps things tight",
    description:
      "Sam ruthlessly prioritizes features, writes crystal-clear user stories, and keeps your roadmap focused. No more feature bloat — just what your users actually need.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Sam",
    specialty: "Product",
    capabilities: [
      "User story writing",
      "Roadmap planning",
      "Prioritization frameworks",
      "Stakeholder management",
    ],
    price: 44.99,
    rating: 4.3,
    reviewCount: 98,
    tier: "Starter",
  },
  {
    id: "p-007",
    name: "Debug Duchess Dana",
    tagline: "No bug can hide from her gaze",
    description:
      "Dana is a master debugger who traces issues through complex distributed systems. She reads stack traces like poetry and finds root causes in minutes, not hours.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Dana",
    specialty: "Engineering",
    capabilities: [
      "Root cause analysis",
      "Log analysis",
      "Distributed tracing",
      "Performance profiling",
    ],
    price: 59.99,
    rating: 4.9,
    reviewCount: 445,
    tier: "Enterprise",
  },
  {
    id: "p-008",
    name: "Terraform Tina",
    tagline: "Infrastructure as code evangelist",
    description:
      "Tina provisions and manages cloud infrastructure with elegant, modular Terraform configurations. Multi-cloud, multi-region — she handles it all with grace.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Tina",
    specialty: "DevOps",
    capabilities: [
      "Terraform modules",
      "AWS/GCP/Azure",
      "Cost optimization",
      "Disaster recovery",
    ],
    price: 79.99,
    rating: 4.4,
    reviewCount: 178,
    tier: "Enterprise",
  },
  {
    id: "p-009",
    name: "A11y Alex",
    tagline: "Accessibility champion for the web",
    description:
      "Alex audits your web application against WCAG guidelines, fixes accessibility violations, and ensures every user can navigate your product regardless of ability.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Alex",
    specialty: "Design",
    capabilities: [
      "WCAG compliance",
      "Screen reader testing",
      "Keyboard navigation",
      "Color contrast analysis",
    ],
    price: 39.99,
    rating: 4.6,
    reviewCount: 132,
    tier: "Starter",
  },
  {
    id: "p-010",
    name: "Dashboard Dashiell",
    tagline: "Data visualization virtuoso",
    description:
      "Dashiell turns raw data into actionable dashboards. He selects the right chart types, designs intuitive layouts, and connects live data sources for real-time insights.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Dashiell",
    specialty: "Data",
    capabilities: [
      "Dashboard design",
      "Data visualization",
      "ETL pipelines",
      "Real-time analytics",
    ],
    price: 64.99,
    rating: 4.2,
    reviewCount: 89,
    tier: "Pro",
  },
  {
    id: "p-011",
    name: "Compliance Carl",
    tagline: "Regulatory compliance on autopilot",
    description:
      "Carl navigates the maze of SOC2, GDPR, HIPAA, and other regulatory frameworks. He generates audit-ready documentation and identifies compliance gaps before auditors do.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Carl",
    specialty: "Security",
    capabilities: [
      "SOC2 preparation",
      "GDPR compliance",
      "Policy generation",
      "Risk assessment",
    ],
    price: 99.99,
    rating: 4.7,
    reviewCount: 67,
    tier: "Enterprise",
  },
  {
    id: "p-012",
    name: "Onboard Olivia",
    tagline: "Developer onboarding accelerator",
    description:
      "Olivia creates comprehensive onboarding guides, documents tribal knowledge, and generates interactive walkthroughs so new hires are productive from day one.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Olivia",
    specialty: "Product",
    capabilities: [
      "Documentation generation",
      "Knowledge base creation",
      "Interactive tutorials",
      "Architecture diagrams",
    ],
    price: 34.99,
    rating: 4.1,
    reviewCount: 156,
    tier: "Starter",
  },
  {
    id: "p-013",
    name: "Test Pilot Theo",
    tagline: "100% coverage is just the beginning",
    description:
      "Theo generates comprehensive test suites — unit, integration, and E2E. He identifies untested edge cases and creates fixtures that mirror real-world data.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Theo",
    specialty: "Engineering",
    capabilities: [
      "Test generation",
      "Coverage analysis",
      "E2E test suites",
      "Mock data creation",
    ],
    price: 54.99,
    rating: 4.5,
    reviewCount: 289,
    tier: "Pro",
  },
  {
    id: "p-014",
    name: "Migrator Max",
    tagline: "Fearless framework migration agent",
    description:
      "Max handles the heavy lifting of major migrations — React class to hooks, REST to GraphQL, monolith to microservices. He plans incremental steps to avoid big-bang rewrites.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Max",
    specialty: "Engineering",
    capabilities: [
      "Framework migration",
      "Incremental refactoring",
      "API transformation",
      "Dependency upgrades",
    ],
    price: 74.99,
    rating: 4.3,
    reviewCount: 112,
    tier: "Pro",
  },
  {
    id: "p-015",
    name: "Metric Maven Mia",
    tagline: "Product analytics and growth hacker",
    description:
      "Mia instruments your product with the right analytics events, builds funnels, and identifies drop-off points. She turns data into growth hypotheses you can actually test.",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Mia",
    specialty: "Product",
    capabilities: [
      "Analytics instrumentation",
      "Funnel analysis",
      "A/B test design",
      "Growth modeling",
    ],
    price: 49.99,
    rating: 4.4,
    reviewCount: 201,
    tier: "Starter",
  },
];

function seedDatabase() {
  for (const persona of seedPersonas) {
    personas.set(persona.id, persona);
  }
}

seedDatabase();

export const db = {
  personas: {
    getAll(): Persona[] {
      return Array.from(personas.values());
    },
    getById(id: string): Persona | undefined {
      return personas.get(id);
    },
    search(filters: {
      q?: string;
      specialty?: string;
      tier?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
    }): Persona[] {
      let results = Array.from(personas.values());

      if (filters.q) {
        const query = filters.q.toLowerCase();
        results = results.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.tagline.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.capabilities.some((c) => c.toLowerCase().includes(query))
        );
      }

      if (filters.specialty) {
        results = results.filter((p) => p.specialty === filters.specialty);
      }

      if (filters.tier) {
        results = results.filter((p) => p.tier === filters.tier);
      }

      if (filters.minPrice !== undefined) {
        results = results.filter((p) => p.price >= filters.minPrice!);
      }

      if (filters.maxPrice !== undefined) {
        results = results.filter((p) => p.price <= filters.maxPrice!);
      }

      if (filters.sort) {
        switch (filters.sort) {
          case "price-asc":
            results.sort((a, b) => a.price - b.price);
            break;
          case "price-desc":
            results.sort((a, b) => b.price - a.price);
            break;
          case "rating-desc":
            results.sort((a, b) => b.rating - a.rating);
            break;
          case "name-asc":
            results.sort((a, b) => a.name.localeCompare(b.name));
            break;
        }
      }

      return results;
    },
  },

  users: {
    getById(id: string): StoredUser | undefined {
      return users.get(id);
    },
    getByEmail(email: string): StoredUser | undefined {
      return Array.from(users.values()).find((u) => u.email === email);
    },
    create(user: StoredUser): StoredUser {
      users.set(user.id, user);
      return user;
    },
  },

  cart: {
    getByUserId(userId: string): CartEntry[] {
      return Array.from(cartItems.values()).filter(
        (item) => item.userId === userId
      );
    },
    getById(id: string): CartEntry | undefined {
      return cartItems.get(id);
    },
    add(userId: string, personaId: string, quantity: number): CartEntry {
      const existing = Array.from(cartItems.values()).find(
        (item) => item.userId === userId && item.personaId === personaId
      );

      if (existing) {
        existing.quantity += quantity;
        cartItems.set(existing.id, existing);
        return existing;
      }

      const entry: CartEntry = {
        id: nextCartItemId(),
        userId,
        personaId,
        quantity,
      };
      cartItems.set(entry.id, entry);
      return entry;
    },
    update(id: string, quantity: number): CartEntry | undefined {
      const item = cartItems.get(id);
      if (!item) return undefined;
      item.quantity = quantity;
      cartItems.set(id, item);
      return item;
    },
    remove(id: string): boolean {
      return cartItems.delete(id);
    },
    clearForUser(userId: string): void {
      for (const [id, item] of cartItems) {
        if (item.userId === userId) {
          cartItems.delete(id);
        }
      }
    },
  },

  favorites: {
    getByUserId(userId: string): string[] {
      return Array.from(favorites.get(userId) ?? []);
    },
    add(userId: string, personaId: string): void {
      if (!favorites.has(userId)) {
        favorites.set(userId, new Set());
      }
      favorites.get(userId)!.add(personaId);
    },
    remove(userId: string, personaId: string): boolean {
      const set = favorites.get(userId);
      if (!set) return false;
      return set.delete(personaId);
    },
    isFavorite(userId: string, personaId: string): boolean {
      return favorites.get(userId)?.has(personaId) ?? false;
    },
  },

  orders: {
    create(order: Order): Order {
      orders.set(order.id, order);
      return order;
    },
    getByUserId(userId: string): Order[] {
      return Array.from(orders.values()).filter((o) => o.userId === userId);
    },
  },

  _nextOrderId: nextOrderId,
};
