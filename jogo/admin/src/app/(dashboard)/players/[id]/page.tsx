"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPlayerById, fetchPlayerGuardians, fetchPlayerTransactions } from "@/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { riskScoreBg, rarityColor, formatRelativeTime } from "@/lib/utils";
import { ArrowLeft, Shield, ShieldOff, RotateCcw } from "lucide-react";
import type { Player, Guardian, Transaction } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    Promise.all([fetchPlayerById(id), fetchPlayerGuardians(id), fetchPlayerTransactions(id)]).then(([p, g, t]) => {
      setPlayer(p);
      setGuardians(g);
      setTransactions(t);
      setLoading(false);
    });
  }, [params.id]);

  if (loading || !player) {
    return <div className="space-y-4"><Skeleton className="h-[400px]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/players")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{player.username}</h1>
          <p className="text-sm text-muted-foreground">Telegram ID: {player.telegramId}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {player.isBanned ? (
            <Button variant="outline" size="sm"><ShieldOff className="h-4 w-4 mr-2" /> Unban</Button>
          ) : (
            <Button variant="destructive" size="sm"><Shield className="h-4 w-4 mr-2" /> Ban</Button>
          )}
          <Button variant="outline" size="sm"><RotateCcw className="h-4 w-4 mr-2" /> Reset Farming</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">VE Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{player.veBalance.toFixed(2)}</div><div className="text-xs text-muted-foreground">Pending: {player.pendingVE.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CS Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{player.csBalance.toLocaleString()}</div><div className="text-xs text-muted-foreground">Pending: {player.pendingCS}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Risk Score</CardTitle></CardHeader><CardContent><Badge className={riskScoreBg(player.riskScore)}>{player.riskScore}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Days Active</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{player.daysActive}</div><div className="text-xs text-muted-foreground">{player.referralCount} referrals</div></CardContent></Card>
      </div>

      <Tabs defaultValue="guardians">
        <TabsList>
          <TabsTrigger value="guardians">Guardians ({guardians.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="guardians">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rarity</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>VE/hr</TableHead>
                    <TableHead>CS/hr</TableHead>
                    <TableHead>Acquired</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guardians.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No guardians</TableCell></TableRow>
                  ) : guardians.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell><Badge className={rarityColor(g.rarity)}>{g.rarity}</Badge></TableCell>
                      <TableCell>{g.level}</TableCell>
                      <TableCell className="font-mono">{g.vePerHour.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{g.csPerHour}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRelativeTime(g.acquiredAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="transactions">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>
                  ) : transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className="font-mono">{t.amount} {t.currency}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRelativeTime(t.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
