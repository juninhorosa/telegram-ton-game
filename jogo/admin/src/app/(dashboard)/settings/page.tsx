"use client";

import { useEffect, useState } from "react";
import { fetchSystemSettings, fetchAuditLog } from "@/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { formatRelativeTime } from "@/lib/utils";
import { Database, Bell, Shield, Bot, Users } from "lucide-react";
import type { AdminUser, AuditLogEntry, NotificationSetting } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSystemSettings(), fetchAuditLog()]).then(([s, a]) => { setSettings(s); setAuditLog(a); setLoading(false); });
  }, []);

  if (loading || !settings) {
    return <div className="space-y-4"><h1 className="text-2xl font-bold">System Settings</h1><Skeleton className="h-[400px]" /></div>;
  }

  const admins = settings.admins as AdminUser[];
  const notifications = settings.notifications as NotificationSetting[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Settings</h1>

      <Tabs defaultValue="admins">
        <TabsList>
          <TabsTrigger value="admins"><Users className="h-4 w-4 mr-2" /> Admins</TabsTrigger>
          <TabsTrigger value="audit"><Shield className="h-4 w-4 mr-2" /> Audit Log</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="system"><Database className="h-4 w-4 mr-2" /> System</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Admin Management</CardTitle>
                <Button size="sm" onClick={() => toast({ title: "Feature coming soon" })}>Create Admin</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>2FA</TableHead><TableHead>Last Login</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell><Badge variant="outline">{admin.role.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{admin.isActive ? <Badge className="bg-emerald-500/10 text-emerald-500">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                      <TableCell>{admin.twoFactorEnabled ? <Badge className="bg-emerald-500/10 text-emerald-500">Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRelativeTime(admin.lastLoginAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle className="text-base">Audit Log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Timestamp</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground text-xs">{formatRelativeTime(entry.timestamp)}</TableCell>
                      <TableCell className="font-medium">{entry.adminName}</TableCell>
                      <TableCell><Badge variant="outline">{entry.action.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{entry.target}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{entry.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {notifications.map((ns) => (
                <div key={ns.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-medium">{ns.name}</div>
                    <div className="text-sm text-muted-foreground">{ns.description}</div>
                    <div className="flex gap-1 mt-1">
                      {ns.channel.map((ch) => <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>)}
                    </div>
                  </div>
                  <Switch checked={ns.enabled} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maintenance Mode</CardTitle>
                <CardDescription>Enable to block player access to the TMA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Switch checked={settings.maintenanceMode as boolean} />
                  <span className="text-sm">{(settings.maintenanceMode as boolean) ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea defaultValue={settings.maintenanceMessage as string} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Database Backup</CardTitle>
                <CardDescription>Last backup: {settings.lastBackup ? formatRelativeTime(settings.lastBackup as string) : "Never"}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => toast({ title: "Backup initiated", description: "This is a mock operation" })}>
                  <Database className="h-4 w-4 mr-2" /> Backup Now
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Telegram Bot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bot Token</Label>
                  <Input type="password" defaultValue={settings.botToken as string} />
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input defaultValue={settings.webhookUrl as string} />
                </div>
                <Button variant="outline" onClick={() => toast({ title: "Test notification sent" })}>
                  <Bot className="h-4 w-4 mr-2" /> Send Test
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
