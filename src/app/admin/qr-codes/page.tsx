"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Loader2, Plus, QrCode as QrIcon, Star } from "lucide-react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createAdminQRCode, getAdminContext, listAdminQRCodes } from "@/lib/api";
import type { QRWithStats } from "@/lib/api";
import type { Restaurant } from "@/lib/supabase";

export default function QrManagerPage() {
  const [qrs, setQrs] = useState<QRWithStats[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrName, setQrName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const baseUrl = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  const fetchData = async () => {
    const [context, qrData] = await Promise.all([getAdminContext(), listAdminQRCodes()]);
    setRestaurant(context.restaurant);
    setQrs(qrData.qrs);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [context, qrData] = await Promise.all([getAdminContext(), listAdminQRCodes()]);
        setRestaurant(context.restaurant);
        setQrs(qrData.qrs);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to load QR codes");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    const url = `${baseUrl}/r/${restaurant.slug}?qr=preview`;
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark: restaurant.brand_color,
        light: "#FFFFFF",
      },
    }).then(setPreview);
  }, [baseUrl, restaurant]);

  const handleCreate = async () => {
    if (!qrName.trim()) {
      toast.error("QR name is required");
      return;
    }

    try {
      await createAdminQRCode({
        name: qrName.trim(),
        table_number: tableNumber.trim() || null,
        custom_message: customMessage.trim() || null,
        fg_color: restaurant?.brand_color || "#FF6B35",
        bg_color: "#FFFFFF",
      });
      toast.success("QR code created");
      setIsCreateOpen(false);
      setQrName("");
      setTableNumber("");
      setCustomMessage("");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create QR");
    }
  };

  const downloadQR = async (qr: QRWithStats) => {
    if (!restaurant) return;
    const url = `${baseUrl}/r/${restaurant.slug}?qr=${qr.id}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      color: {
        dark: qr.fg_color || restaurant.brand_color,
        light: qr.bg_color || "#FFFFFF",
      },
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${restaurant.slug}-${qr.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="text-center py-20">No restaurant assigned to this account.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Codes</h1>
          <p className="text-muted-foreground">Generate physical review links and track scans by source.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 rounded-lg">
          <Plus size={18} />
          Generate New QR
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {qrs.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-10">No QR codes generated yet.</div>
        ) : (
          qrs.map((qr) => (
            <Card key={qr.id} className="rounded-lg border-none shadow-sm bg-white dark:bg-[#0F0F12] group overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-primary/5 p-8 flex justify-center border-b">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <QrIcon size={120} style={{ color: qr.fg_color || restaurant.brand_color }} />
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg truncate">{qr.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {qr.table_number ? `Table ${qr.table_number}` : "General QR"} · {new Date(qr.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={qr.is_active ? "secondary" : "destructive"}>{qr.is_active ? "Active" : "Off"}</Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-2 py-2 border-y border-dashed text-center">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Scans</p>
                      <p className="font-bold">{qr.scan_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Reviews</p>
                      <p className="font-bold">{qr.review_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Rate</p>
                      <p className="font-bold">{qr.completion_rate}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Avg</p>
                      <p className="font-bold inline-flex items-center gap-1">
                        {qr.average_rating || "--"} <Star size={10} className="fill-yellow-400 text-yellow-400" />
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => downloadQR(qr)}>
                      <Download size={14} />
                      PNG
                    </Button>
                    <a href={`/r/${restaurant.slug}?qr=${qr.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="gap-2 rounded-lg w-full">
                        <ExternalLink size={14} />
                        Open
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>New QR Code</DialogTitle>
            <DialogDescription>Create a unique QR code for a table, counter, receipt, or entrance.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="qrName">QR Name</Label>
              <Input id="qrName" placeholder="Main Entrance" value={qrName} onChange={(event) => setQrName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableNumber">Table number</Label>
              <Input id="tableNumber" placeholder="Optional" value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Custom message</Label>
              <Input id="message" placeholder="How was your takeaway order?" value={customMessage} onChange={(event) => setCustomMessage(event.target.value)} />
            </div>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                {preview ? <img src={preview} alt="QR preview" className="w-44 h-44" /> : <QrIcon className="w-44 h-44 text-muted" />}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Generate & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
