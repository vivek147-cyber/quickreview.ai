"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createAdminLabel, deleteAdminLabel, listAdminLabels, updateAdminLabel } from "@/lib/api";
import type { Label } from "@/lib/supabase";

const COMMON_EMOJIS = ["🍛","🍖","🍕","🍜","🍣","🥗","☕","🍰","🍹","⚡","🌟","🙋","😊","👨‍🍳","🏆","💯","🎉","❤️","⏳","🥶","🔇","💸"];

export default function LabelManagerPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Label | null>(null);
  const [form, setForm] = useState({ text: "", emoji: "", sentiment: "positive" as "positive" | "constructive" });

  const load = async () => {
    const data = await listAdminLabels();
    setLabels(data.labels);
  };

  useEffect(() => {
    load()
      .catch(() => toast.error("Unable to load labels"))
      .finally(() => setLoading(false));
  }, []);

  const positive = useMemo(() => labels.filter(l => l.sentiment === "positive"), [labels]);
  const constructive = useMemo(() => labels.filter(l => l.sentiment === "constructive"), [labels]);

  const openCreate = (sentiment: "positive" | "constructive" = "positive") => {
    setEditing(null);
    setForm({ text: "", emoji: "", sentiment });
    setShowDialog(true);
  };

  const openEdit = (label: Label) => {
    setEditing(label);
    setForm({ text: label.text, emoji: label.emoji || "", sentiment: label.sentiment });
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.text.trim()) { toast.error("Label text is required"); return; }
    try {
      if (editing) {
        await updateAdminLabel(editing.id, { text: form.text.trim(), emoji: form.emoji.trim() || null, sentiment: form.sentiment });
        toast.success("Label updated");
      } else {
        await createAdminLabel({ text: form.text.trim(), emoji: form.emoji.trim() || null, sentiment: form.sentiment });
        toast.success("Label created");
      }
      setShowDialog(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save label");
    }
  };

  const toggleVisible = async (label: Label) => {
    await updateAdminLabel(label.id, { is_visible: !label.is_visible });
    await load();
  };

  const remove = async (label: Label) => {
    if (!confirm(`Delete "${label.text}"?`)) return;
    await deleteAdminLabel(label.id);
    toast.success("Label deleted");
    await load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="animate-spin text-orange-500 w-6 h-6" />
    </div>
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Labels</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chips customers tap before AI writes their review.
          <span className="mx-1">·</span>
          <span className="text-green-600 font-medium">Positive</span> shows for 4–5★
          <span className="mx-1">·</span>
          <span className="text-amber-600 font-medium">Constructive</span> shows for 1–3★
        </p>
      </div>

      {/* Positive labels */}
      <LabelGroup
        title="Positive Labels"
        subtitle="Shown to happy customers (4–5 stars)"
        color="green"
        labels={positive}
        onAdd={() => openCreate("positive")}
        onEdit={openEdit}
        onToggle={toggleVisible}
        onDelete={remove}
      />

      {/* Constructive labels */}
      <LabelGroup
        title="Constructive Labels"
        subtitle="Shown to less happy customers (1–3 stars)"
        color="amber"
        labels={constructive}
        onAdd={() => openCreate("constructive")}
        onEdit={openEdit}
        onToggle={toggleVisible}
        onDelete={remove}
      />

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div>
              <p className="font-black text-gray-900 text-lg">{editing ? "Edit Label" : "Add Label"}</p>
              <p className="text-sm text-gray-400 mt-0.5">Customers see this as a tap chip on the review screen.</p>
            </div>

            {/* Sentiment toggle */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Show for</p>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setForm(f => ({ ...f, sentiment: "positive" }))}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${form.sentiment === "positive" ? "bg-green-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  ⭐ Positive (4–5★)
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, sentiment: "constructive" }))}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${form.sentiment === "constructive" ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  💬 Constructive (1–3★)
                </button>
              </div>
            </div>

            {/* Text */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Label text</p>
              <Input
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder="e.g. Butter Chicken, Fast Service, Cosy Vibe"
                className="h-10"
                autoFocus
                onKeyDown={e => e.key === "Enter" && save()}
              />
            </div>

            {/* Emoji */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Emoji <span className="normal-case font-normal text-gray-300">— optional</span>
              </p>
              <div className="flex gap-2 items-center mb-2">
                <Input
                  value={form.emoji}
                  onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  placeholder="Paste or type emoji"
                  className="h-10 w-28 text-lg text-center"
                  maxLength={2}
                />
                <p className="text-xs text-gray-400 leading-snug">Type any emoji or tap one below</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={`w-8 h-8 rounded-lg text-base hover:bg-orange-50 transition-all ${form.emoji === e ? "bg-orange-100 ring-1 ring-orange-400" : "bg-gray-50"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={save} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {editing ? "Save Changes" : "Create Label"}
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LabelGroup({
  title, subtitle, color, labels, onAdd, onEdit, onToggle, onDelete
}: {
  title: string; subtitle: string; color: "green" | "amber";
  labels: Label[];
  onAdd: () => void;
  onEdit: (l: Label) => void;
  onToggle: (l: Label) => void;
  onDelete: (l: Label) => void;
}) {
  const dot = color === "green" ? "bg-green-500" : "bg-amber-500";
  const btn = color === "green" ? "bg-green-500 hover:bg-green-600" : "bg-amber-500 hover:bg-amber-600";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${dot}`} />
          <div>
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{labels.length}</span>
        </div>
        <button onClick={onAdd}
          className={`flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-xl ${btn} transition-colors`}>
          <Plus size={13} /> Add
        </button>
      </div>

      {labels.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          No labels yet — add one above.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {labels.map(label => (
            <div key={label.id} className={`flex items-center gap-3 px-5 py-3 ${!label.is_visible ? "opacity-50" : ""}`}>
              <span className="text-xl w-7 text-center">{label.emoji || ""}</span>
              <span className="flex-1 text-sm font-medium text-gray-900">{label.text}</span>
              {!label.is_visible && (
                <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Hidden</span>
              )}
              <div className="flex gap-0.5">
                <button onClick={() => onToggle(label)} title={label.is_visible ? "Hide" : "Show"}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all">
                  {label.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => onEdit(label)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-orange-500 hover:bg-orange-50 transition-all">
                  <Pencil size={15} />
                </button>
                <button onClick={() => onDelete(label)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
