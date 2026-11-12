import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { Persona } from "@acme/shared";
import { PersonaCard } from "~/components/PersonaCard";
import { SearchBar } from "~/components/SearchBar";
import { FilterPanel } from "~/components/FilterPanel";

interface SearchParams {
  q?: string;
  specialty?: string;
  tier?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: (search.q as string) || undefined,
    specialty: (search.specialty as string) || undefined,
    tier: (search.tier as string) || undefined,
    minPrice: search.minPrice ? Number(search.minPrice) : undefined,
    maxPrice: search.maxPrice ? Number(search.maxPrice) : undefined,
    sort: (search.sort as string) || undefined,
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const queryString = new URLSearchParams();
  if (search.q) queryString.set("q", search.q);
  if (search.specialty) queryString.set("specialty", search.specialty);
  if (search.tier) queryString.set("tier", search.tier);
  if (search.minPrice) queryString.set("minPrice", String(search.minPrice));
  if (search.maxPrice) queryString.set("maxPrice", String(search.maxPrice));
  if (search.sort) queryString.set("sort", search.sort);

  const qs = queryString.toString();
  // The key includes the filters, so each filter combination is cached and fetched on its own.
  const { data: personas = [], isLoading } = useQuery({
    queryKey: ["personas", qs],
    queryFn: () => api.get<Persona[]>(`/personas${qs ? `?${qs}` : ""}`),
  });

  const updateSearch = (updates: Partial<SearchParams>) => {
    navigate({
      to: "/",
      search: (prev: SearchParams) => {
        const next = { ...prev, ...updates };
        for (const key of Object.keys(next) as (keyof SearchParams)[]) {
          if (next[key] === undefined || next[key] === "") {
            delete next[key];
          }
        }
        return next;
      },
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Discover Agentic Personas
        </h1>
        <p className="text-gray-600">
          Find the perfect AI agent for your team. Browse our curated collection
          of specialized personas.
        </p>
      </div>

      <SearchBar
        value={search.q ?? ""}
        onChange={(q) => updateSearch({ q: q || undefined })}
      />

      <div className="mt-6 flex flex-col lg:flex-row gap-8">
        <FilterPanel
          specialty={search.specialty}
          tier={search.tier}
          sort={search.sort}
          onSpecialtyChange={(specialty) => updateSearch({ specialty })}
          onTierChange={(tier) => updateSearch({ tier })}
          onSortChange={(sort) => updateSearch({ sort })}
        />

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
                >
                  <div className="w-16 h-16 bg-gray-200 rounded-full mb-4" />
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : personas.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                No personas found matching your criteria.
              </p>
              <button
                onClick={() => navigate({ to: "/", search: {} })}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {personas.map((persona) => (
                <PersonaCard key={persona.id} persona={persona} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
