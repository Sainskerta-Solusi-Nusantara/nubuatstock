import { WatchlistView } from "./view";

export const metadata = {
  title: "Watchlist",
};

/**
 * Watchlist page (Server Component shell → Client view).
 *
 * Auth gating dilakukan di middleware/layout (Agent 9 + Agent 3). Halaman ini
 * tidak memuat data di server karena data per-user via cookie session terbaik
 * di-fetch di client dengan TanStack Query (refetch interval untuk live quotes).
 */
export default function WatchlistPage() {
  return <WatchlistView />;
}
