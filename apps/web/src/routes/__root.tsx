import { createRootRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useAuth } from "~/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { Cart } from "@acme/shared";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const { data: cart } = useQuery({
    // Same key as the cart pages, so the cart mutations' invalidations refresh the badge too.
    queryKey: ["cart"],
    queryFn: () => api.get<Cart>("/cart"),
    enabled: !!user,
  });

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <span className="text-xl font-bold text-gray-900">
                  Agentic Personas
                </span>
              </Link>
              <div className="hidden sm:flex items-center gap-4">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors [&.active]:text-indigo-600"
                >
                  Browse
                </Link>
                {user && (
                  <Link
                    to="/favorites"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors [&.active]:text-indigo-600"
                  >
                    Favorites
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link
                    to="/cart"
                    className="relative text-gray-600 hover:text-gray-900 p-2 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                      />
                    </svg>
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {user.username}
                    </span>
                    <button
                      onClick={() => {
                        logout();
                        router.navigate({ to: "/" });
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
