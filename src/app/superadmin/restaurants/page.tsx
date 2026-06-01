"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Pencil, Plus, Search, ShieldAlert, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSuperRestaurants, onboardRestaurant, updateSuperRestaurant } from "@/lib/api";
import type { Restaurant, RestaurantCategory, RestaurantPlan, RestaurantStatus } from "@/lib/supabase";

type RestaurantRow = Restaurant & {
  owner_name: string | null;
  owner_email: string | null;
  total_reviews: number;
  average_rating: number;
  last_active: string | null;
};

const categoryOptions: { value: RestaurantCategory; label: string }[] = [
  { value: "qsr", label: "QSR" },
  { value: "casual_dining", label: "Casual Dining" },
  { value: "fine_dining", label: "Fine Dining" },
  { value: "cafe", label: "Cafe" },
  { value: "cloud_kitchen", label: "Cloud Kitchen" },
  { value: "hotel", label: "Hotel" },
];

const planOptions: RestaurantPlan[] = ["free", "pro", "enterprise"];

export default function SuperRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<RestaurantRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", slug: "", city: "", category: "casual_dining", brandColor: "", plan: "free",
  });
  const [editSaving, setEditSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", slug: "", city: "", category: "casual_dining",
    ownerName: "", ownerEmail: "", brandColor: "#FF6B35", plan: "free",
  });

  const fetchRestaurants = async () => {
    const data = await getSuperRestaurants();
    setRestaurants(data.restaurants);
  };

  useEffect(() => {
    void (async () => {
      try {
        const data = await getSuperRestaurants();
        setRestaurants(data.restaurants);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to load restaurants");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return restaurants.filter((r) =>
      `${r.name} ${r.owner_name ?? ""} ${r.owner_email ?? ""} ${r.plan} ${r.status}`.toLowerCase().includes(query)
    );
  }, [restaurants, search]);

  const handleNameChange = (name: string) => {
    setForm((c) => ({ ...c, name, slug: c.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }));
  };

  const handleOnboard = async () => {
    try {
      const response = await onboardRestaurant(form);
      setTemporaryPassword(response.temporaryPassword || null);
      toast.success("Restaurant onboarded");
      await fetchRestaurants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to onboard restaurant");
    }
  };

  const openEdit = (r: RestaurantRow) => {
    setEditTarget(r);
    setEditForm({
      name: r.name,
      slug: r.slug,
      city: r.city ?? "",
      category: r.category ?? "casual_dining",
      brandColor: r.brand_color,
      plan: r.plan,
    });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await updateSuperRestaurant(editTarget.id, {
        name: editForm.name,
        slug: editForm.slug,
        city: editForm.city || null,
        category: editForm.category,
        brand_color: editForm.brandColor,
        plan: editForm.plan,
      });
      toast.success("Restaurant updated");
      setEditTarget(null);
      await fetchRestaurants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update restaurant");
    } finally {
      setEditSaving(false);
    }
  };

  const setStatus = async (restaurant: RestaurantRow, status: RestaurantStatus) => {
    try {
      await updateSuperRestaurant(restaurant.id, { status });
      toast.success(`${restaurant.name} is now ${status}`);
      await fetchRestaurants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update restaurant");
    }
  };

  const activeCount = restaurants.filter((r) => r.status === "active").length;
  const suspendedCount = restaurants.filter((r) => r.status === "suspended").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Restaurants</h1>
          <p className="text-muted-foreground font-medium">Onboard and manage every restaurant on the platform.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-lg"><Plus size={18} />Onboard Restaurant</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Onboard New Restaurant</DialogTitle>
              <DialogDescription>Create the restaurant, owner profile, and Supabase Auth login.</DialogDescription>
            </DialogHeader>
            {temporaryPassword ? (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">Share this temporary password with the owner. It is shown once.</p>
                <div className="rounded-lg border bg-muted p-4 font-mono text-sm break-all">{temporaryPassword}</div>
                <Button className="w-full" onClick={() => {
                  setTemporaryPassword(null); setIsCreateOpen(false);
                  setForm({ name: "", slug: "", city: "", category: "casual_dining", ownerName: "", ownerEmail: "", brandColor: "#FF6B35", plan: "free" });
                }}>Done</Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field id="name" label="Restaurant name" value={form.name} onChange={handleNameChange} />
                    <Field id="slug" label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field id="city" label="City / Location" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                    <SelectField id="cat" label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={categoryOptions.map((o) => ({ value: o.value, label: o.label }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field id="oname" label="Owner full name" value={form.ownerName} onChange={(v) => setForm({ ...form, ownerName: v })} />
                    <Field id="oemail" label="Owner email" value={form.ownerEmail} onChange={(v) => setForm({ ...form, ownerEmail: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field id="color" label="Brand color" value={form.brandColor} onChange={(v) => setForm({ ...form, brandColor: v })} />
                    <SelectField id="plan" label="Plan" value={form.plan} onChange={(v) => setForm({ ...form, plan: v })} options={planOptions.map((p) => ({ value: p, label: p }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleOnboard}>Create Restaurant Account</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Restaurant Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[580px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
            <DialogDescription>Update restaurant details. Owner login is not changed here.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Field id="ename" label="Restaurant name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
              <Field id="eslug" label="Slug" value={editForm.slug} onChange={(v) => setEditForm({ ...editForm, slug: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field id="ecity" label="City" value={editForm.city} onChange={(v) => setEditForm({ ...editForm, city: v })} />
              <SelectField id="ecat" label="Category" value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })} options={categoryOptions.map((o) => ({ value: o.value, label: o.label }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ecolor">Brand color</Label>
                <div className="flex gap-2 items-center">
                  <div className="w-8 h-8 rounded border shrink-0" style={{ backgroundColor: editForm.brandColor }} />
                  <Input id="ecolor" value={editForm.brandColor} onChange={(e) => setEditForm({ ...editForm, brandColor: e.target.value })} />
                </div>
              </div>
              <SelectField id="eplan" label="Plan" value={editForm.plan} onChange={(v) => setEditForm({ ...editForm, plan: v })} options={planOptions.map((p) => ({ value: p, label: p }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Metric label="Total Restaurants" value={restaurants.length} />
        <Metric label="Active" value={activeCount} />
        <Metric label="Suspended" value={suspendedCount} />
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-[#0F0F12] rounded-lg">
        <CardContent className="p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input placeholder="Search restaurants..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white dark:bg-[#0F0F12] overflow-hidden rounded-lg">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="py-5 pl-8">Restaurant</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reviews</TableHead>
              <TableHead>Avg Rating</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="pr-8 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="animate-spin inline mr-2 h-4 w-4" />Loading restaurants...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">No restaurants found.</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="py-4 pl-8">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg border">
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{r.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-bold text-sm">{r.name}</span>
                        <span className="block text-[10px] text-muted-foreground">/{r.slug}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{r.owner_name || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">{r.owner_email || "No login"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.plan === "pro" ? "default" : "outline"} className="capitalize">{r.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "active" ? "secondary" : "destructive"} className="capitalize">{r.status}</Badge>
                  </TableCell>
                  <TableCell className="font-bold">{r.total_reviews}</TableCell>
                  <TableCell>{r.average_rating || "--"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.last_active ? new Date(r.last_active).toLocaleDateString() : "--"}
                  </TableCell>
                  <TableCell className="pr-8">
                    <div className="flex justify-end gap-1">
                      <a href={`/r/${r.slug}`} target="_blank">
                        <Button variant="ghost" size="icon"><ExternalLink size={16} /></Button>
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil size={16} />
                      </Button>
                      {r.status === "active" ? (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setStatus(r, "suspended")}>
                          <ShieldAlert size={16} />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="text-green-600" onClick={() => setStatus(r, "active")}>
                          <CheckCircle2 size={16} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setStatus(r, "deleted")}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ id, label, value, onChange, options }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className="h-10 rounded-md border bg-background px-3 text-sm capitalize" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value} className="capitalize">{o.label}</option>)}
      </select>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-none shadow-sm bg-white dark:bg-[#0F0F12] rounded-lg">
      <CardContent className="p-6">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-black mt-1">{value}</h3>
      </CardContent>
    </Card>
  );
}
