"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchPlayers } from "@/data";
import { DataTable } from "@/components/ui/data-table";
import { playerColumns } from "@/components/players/player-columns";
import type { Player } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers().then((data) => { setPlayers(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Players</h1>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Players</h1>
      <DataTable
        columns={playerColumns}
        data={players}
        searchPlaceholder="Search by username..."
        searchColumn="username"
        onRowClick={(player) => router.push(`/players/${player.id}`)}
      />
    </div>
  );
}
