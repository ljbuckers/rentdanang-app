"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";

interface FavoriteButtonProps {
  listingId: string;
  isFavorited?: boolean;
  className?: string;
}

export default function FavoriteButton({ listingId, isFavorited: initial = false, className = "" }: FavoriteButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      if (favorited) {
        await fetch(`/api/favorites?listing_id=${listingId}`, { method: "DELETE" });
        setFavorited(false);
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listing_id: listingId }),
        });
        setFavorited(true);
      }
    } catch {}
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`p-1.5 rounded-full transition-all ${
        favorited
          ? "text-red-500 bg-white/90 hover:bg-white"
          : "text-white/80 bg-black/20 hover:bg-black/40 hover:text-white"
      } ${className}`}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    </button>
  );
}
