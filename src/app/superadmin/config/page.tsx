"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, Save, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getSystemConfig, setSystemConfig } from "@/lib/api";

export default function SystemConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showGroqKey, setShowGroqKey] = useState(false);

  const [globalConfig, setGlobalConfig] = useState({
    maintenance_mode: false,
  });

  const [groqConfig, setGroqConfig] = useState({
    api_key: "",
  });

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const [globalData, groqData] = await Promise.all([
          getSystemConfig("global_settings"),
          getSystemConfig("groq_settings"),
        ]);
        if (globalData && typeof globalData === "object") {
          setGlobalConfig((prev) => ({ ...prev, ...(globalData as Partial<typeof prev>) }));
        }
        if (groqData && typeof groqData === "object") {
          setGroqConfig((prev) => ({ ...prev, ...(groqData as Partial<typeof prev>) }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load configuration";
        setLoadError(message);
        if (message === "Unauthorized") {
          router.replace(`/login?next=${encodeURIComponent("/superadmin/config")}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [router]);

  const handleSaveGlobal = async () => {
    setSaving(true);
    const result = await setSystemConfig("global_settings", globalConfig);
    if (result) toast.success("Global settings saved.");
    else toast.error("Failed to save global settings.");
    setSaving(false);
  };

  const handleSaveGemini = async () => {
    if (!groqConfig.api_key.trim()) {
      toast.error("Please enter a Groq API key.");
      return;
    }
    setSaving(true);
    const result = await setSystemConfig("groq_settings", groqConfig);
    if (result) toast.success("Groq API key saved. All restaurants will use this key immediately.");
    else toast.error("Failed to save Groq key.");
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading configuration...</div>;
  if (loadError) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Unable to load configuration</h1>
        <p className="text-muted-foreground mt-2">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage global settings, API keys, and platform defaults.</p>
      </div>

      <div className="grid gap-8">
        {/* Gemini API Key — dedicated card so it's always saved separately */}
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="text-primary" />
              Groq AI Configuration
            </CardTitle>
            <CardDescription>
              This key is used for all AI review generation across every restaurant. Get your free key at{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                console.groq.com
              </a>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Groq API Key</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="groq_key"
                    placeholder="gsk_..."
                    type={showGroqKey ? "text" : "password"}
                    value={groqConfig.api_key}
                    onChange={(e) => setGroqConfig({ api_key: e.target.value })}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <Button onClick={handleSaveGemini} disabled={saving} className="gap-2 shrink-0">
                  <Save size={16} />
                  Save Key
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Stored securely in system_config. Falls back to the GROQ_API_KEY env var if not set here.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-100 shadow-xl bg-red-50/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-red-100">
              <div className="space-y-1">
                <p className="font-medium text-destructive">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">
                  Disable access to the customer review flow for all restaurants. Admin panels remain active.
                </p>
              </div>
              <Switch
                checked={globalConfig.maintenance_mode}
                onCheckedChange={(checked) => setGlobalConfig((prev) => ({ ...prev, maintenance_mode: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveGlobal} disabled={saving} className="gap-2">
            <Save size={18} />
            {saving ? "Saving..." : "Save Global Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
