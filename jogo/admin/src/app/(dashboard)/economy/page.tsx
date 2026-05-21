"use client";

import { useEffect, useState } from "react";
import { fetchEconomyConfig } from "@/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rarityColor } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Save } from "lucide-react";
import type { EconomyConfig } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function EconomyPage() {
  const [config, setConfig] = useState<EconomyConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEconomyConfig().then((data) => { setConfig(data); setLoading(false); });
  }, []);

  if (loading || !config) {
    return <div className="space-y-4"><h1 className="text-2xl font-bold">Economy Settings</h1><Skeleton className="h-[400px]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Economy Settings</h1>
        <Button onClick={() => toast({ title: "Changes published", description: "Economy settings have been updated" })}>
          <Save className="h-4 w-4 mr-2" /> Publish Changes
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Guardian Prices</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Guardian</TableHead><TableHead>Rarity</TableHead><TableHead>TON</TableHead><TableHead>VE</TableHead></TableRow></TableHeader>
              <TableBody>
                {config.guardianPrices.map((gp) => (
                  <TableRow key={gp.id}>
                    <TableCell className="font-medium">{gp.name}</TableCell>
                    <TableCell><Badge className={rarityColor(gp.rarity)}>{gp.rarity}</Badge></TableCell>
                    <TableCell className="font-mono">{gp.priceTon}</TableCell>
                    <TableCell className="font-mono">{gp.priceVe}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Farming Rates</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Rarity</TableHead><TableHead>VE/hr</TableHead><TableHead>CS/hr</TableHead></TableRow></TableHeader>
              <TableBody>
                {config.farmingRates.map((fr) => (
                  <TableRow key={fr.rarity}>
                    <TableCell><Badge className={rarityColor(fr.rarity)}>{fr.rarity}</Badge></TableCell>
                    <TableCell className="font-mono">{fr.vePerHour}</TableCell>
                    <TableCell className="font-mono">{fr.csPerHour}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Level Multipliers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Level</TableHead><TableHead>Multiplier</TableHead><TableHead>CS Cost</TableHead></TableRow></TableHeader>
              <TableBody>
                {config.levelMultipliers.map((lm) => (
                  <TableRow key={lm.level}>
                    <TableCell>{lm.level}</TableCell>
                    <TableCell className="font-mono">{lm.multiplier}x</TableCell>
                    <TableCell className="font-mono">{lm.csCost.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Global Limits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(config.globalLimits).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
                <span className="font-mono text-sm">{value}{key.includes("Percent") ? "%" : ""}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Referral Commissions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {config.referralCommissions.map((rc) => (
              <div key={rc.level} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Level {rc.level}:</span>
                <Badge variant="outline">{rc.percent}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
