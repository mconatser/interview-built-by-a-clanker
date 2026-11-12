import { Link } from "@tanstack/react-router";
import type { Persona } from "@acme/shared";
import { StarRating } from "./StarRating";

const tierColors = {
  Starter: "bg-green-100 text-green-800",
  Pro: "bg-blue-100 text-blue-800",
  Enterprise: "bg-purple-100 text-purple-800",
};

export function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <Link
      to="/personas/$personaId"
      params={{ personaId: persona.id }}
      className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start gap-4 mb-4">
        <img
          src={persona.avatarUrl}
          alt={persona.name}
          className="w-14 h-14 rounded-xl bg-gray-100 group-hover:scale-105 transition-transform"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {persona.name}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${tierColors[persona.tier]}`}
            >
              {persona.tier}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{persona.tagline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {persona.capabilities.slice(0, 3).map((cap) => (
          <span
            key={cap}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md"
          >
            {cap}
          </span>
        ))}
        {persona.capabilities.length > 3 && (
          <span className="text-xs text-gray-400 px-2 py-1">
            +{persona.capabilities.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={persona.rating} size="sm" />
          <span className="text-xs text-gray-400">
            ({persona.reviewCount})
          </span>
        </div>
        <p className="text-lg font-bold text-gray-900">
          ${persona.price.toFixed(2)}
          <span className="text-xs font-normal text-gray-500">/mo</span>
        </p>
      </div>
    </Link>
  );
}
