import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { queryClient } from "~/lib/queryClient";
import { StarRating } from "~/components/StarRating";
import type { Persona, Cart } from "@acme/shared";

export const Route = createFileRoute("/personas/$personaId")({
  component: PersonaDetailPage,
});

function PersonaDetailPage() {
  const { personaId } = Route.useParams();
  const { user } = useAuth();

  const { data: persona, isLoading } = useQuery({
    queryKey: ["persona", personaId],
    queryFn: () => api.get<Persona>(`/personas/${personaId}`),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await api.get<{ favorites: Persona[] }>("/favorites");
      return res.favorites.map((p) => p.id);
    },
  });

  const isFavorited = favorites.includes(personaId);

  const addToCart = useMutation({
    mutationFn: () =>
      api.post<Cart>("/cart", { personaId, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: () =>
      isFavorited
        ? api.delete(`/favorites/${personaId}`)
        : api.post("/favorites", { personaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Persona not found
        </h2>
        <Link to="/" className="text-indigo-600 hover:text-indigo-700">
          Back to browse
        </Link>
      </div>
    );
  }

  const tierColors = {
    Starter: "bg-green-100 text-green-800",
    Pro: "bg-blue-100 text-blue-800",
    Enterprise: "bg-purple-100 text-purple-800",
  };

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to browse
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-8 md:flex gap-8">
          <div className="flex-shrink-0 mb-6 md:mb-0">
            <img
              src={persona.avatarUrl}
              alt={persona.name}
              className="w-32 h-32 rounded-2xl bg-gray-100"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {persona.name}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${tierColors[persona.tier]}`}
                  >
                    {persona.tier}
                  </span>
                </div>
                <p className="text-lg text-gray-600 mb-3">{persona.tagline}</p>
                <div className="flex items-center gap-2 mb-4">
                  <StarRating rating={persona.rating} />
                  <span className="text-sm text-gray-500">
                    ({persona.reviewCount} reviews)
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  ${persona.price.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">per month</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Specialty
              </h3>
              <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                {persona.specialty}
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                About
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {persona.description}
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                {persona.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => addToCart.mutate()}
                  disabled={addToCart.isPending}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {addToCart.isPending ? "Adding..." : "Add to Cart"}
                </button>
                <button
                  onClick={() => toggleFavorite.mutate()}
                  disabled={toggleFavorite.isPending}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg
                    className={`w-6 h-6 ${isFavorited ? "text-red-500 fill-red-500" : "text-gray-400"}`}
                    fill={isFavorited ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>
            )}

            {!user && (
              <p className="text-gray-500 text-sm">
                <Link to="/login" className="text-indigo-600 hover:text-indigo-700">
                  Sign in
                </Link>{" "}
                to add to cart or save as favorite.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
