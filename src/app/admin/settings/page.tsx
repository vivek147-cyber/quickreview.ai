"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminContext } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [placeId, setPlaceId] = useState("");
  const [originalPlaceId, setOriginalPlaceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminContext()
      .then(ctx => {
        const id = ctx.restaurant?.google_place_id ?? "";
        setPlaceId(id);
        setOriginalPlaceId(id);
      })
      .catch(() => toast.error("Unable to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ google_place_id: placeId.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setOriginalPlaceId(placeId.trim());
      toast.success("Google Place ID saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = placeId.trim() !== originalPlaceId;

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your restaurant's Google review link.</p>
      </div>

      {/* Google Place ID card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
            <MapPin size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Google Place ID</p>
            <p className="text-xs text-gray-400">Links your QR reviews directly to your Google listing</p>
          </div>
        </div>

        <div className="space-y-2">
          <Input
            value={placeId}
            onChange={e => setPlaceId(e.target.value)}
            placeholder="ChIJ2eUgeAK6j4ARbn5u_wAGqWA"
            className="h-10 font-mono text-sm"
          />
          {placeId && (
            <a
              href={`https://search.google.com/local/writereview?placeid=${placeId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-medium"
            >
              <ExternalLink size={12} />
              Test this link
            </a>
          )}
        </div>

        {/* How to find */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-xs text-gray-600">
          <p className="font-bold text-gray-800 text-[13px]">How to find your Place ID</p>
          {[
            "Search your restaurant on Google Maps",
            "Click Share → Copy link",
            "Paste here — the Place ID starts with ChIJ...",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
          <div className="pt-1">
            <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
              target="_blank" rel="noreferrer"
              className="text-orange-500 hover:text-orange-600 font-medium inline-flex items-center gap-1">
              Or use the Place ID Finder tool <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <Button
          onClick={save}
          disabled={!isDirty || saving}
          className="w-full bg-orange-500 hover:bg-orange-600 gap-2"
        >
          {saving ? <><Save size={15} className="animate-pulse" /> Saving…</> : <><Check size={15} /> Save Place ID</>}
        </Button>
      </div>

      {/* How the review flow works */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <p className="font-bold text-gray-900 text-sm">How the review flow works</p>
        <div className="space-y-3 text-xs text-gray-600">
          {[
            { icon: "1", text: "Customer scans QR → rates 4–5★ → AI writes review → copies it to clipboard" },
            { icon: "2", text: "Google Maps opens to your exact listing via the Place ID link" },
            { icon: "3", text: "Customer pastes the review text and hits Post" },
            { icon: "⚠", text: "1–3★ reviews are saved privately to your dashboard only — never posted publicly" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-2.5">
              <span className={`w-4 h-4 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 ${icon === "⚠" ? "bg-amber-100 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                {icon}
              </span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">Does it work in Incognito?</p>
          <p>Yes — the Google Maps review page opens and the review is already in clipboard. The customer just needs to be logged into a Google account. Incognito doesn't block clipboard or Google sign-in.</p>
        </div>
      </div>
    </div>
  );
}
