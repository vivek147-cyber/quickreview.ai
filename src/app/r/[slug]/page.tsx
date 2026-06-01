"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Check, Copy, Edit2, ExternalLink, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateReviews, getPublicReviewPage, logQRScan, submitPublicReview } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import type { Label, QRCodeRow, Restaurant } from "@/lib/supabase";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading review page...</div>}>
      <ReviewPageContent />
    </Suspense>
  );
}

function ReviewPageContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const qrId = searchParams.get("qr");
  const slug = params.slug;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [qr, setQr] = useState<QRCodeRow | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [scanId, setScanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [aiReviews, setAiReviews] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editedReviews, setEditedReviews] = useState<Record<number, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerations, setRegenerations] = useState(0);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedReview, setSubmittedReview] = useState("");
  const [copyAgainDone, setCopyAgainDone] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const key = "quikreview_session_id";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(key, created);
    return created;
  }, []);

  useEffect(() => {
    if (!slug || !sessionId) return;

    getPublicReviewPage(slug, qrId)
      .then(async (data) => {
        setRestaurant(data.restaurant);
        setQr(data.qr);
        setLabels(data.labels);
        const scan = await logQRScan({
          restaurantId: data.restaurant.id,
          qrCodeId: data.qr?.id || qrId,
          sessionId,
        });
        setScanId(scan.scanId);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [slug, qrId, sessionId]);

  const visibleLabels = labels.filter((label) => label.sentiment === (rating >= 4 ? "positive" : "constructive"));
  const selectedReview = selectedIndex === null ? null : editedReviews[selectedIndex] || aiReviews[selectedIndex];

  const toggleRating = (value: number) => {
    setRating((current) => (current === value ? 0 : value));
    setSelectedLabels([]);
    setAiReviews([]);
    setSelectedIndex(null);
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );
  };

  const handleGenerate = async (isRegeneration = false) => {
    if (!restaurant || rating === 0) return;
    if (selectedLabels.length === 0) {
      toast.error("Please select at least one chip");
      return;
    }
    if (isRegeneration && regenerations >= 3) {
      toast.error("You have reached the refresh limit for this session");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await generateReviews({
        restaurantName: restaurant.name,
        restaurantCategory: restaurant.category,
        rating,
        selectedLabels,
        restaurantId: restaurant.id,
      });
      setAiReviews(response.reviews.slice(0, 4));
      setSelectedIndex(0);
      setEditedReviews({});
      setEditingIndex(null);
      if (isRegeneration) setRegenerations((current) => current + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to generate reviews");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!restaurant || selectedIndex === null || !selectedReview) return;
    const timeToSubmit = Math.round((Date.now() - startedAt) / 1000);
    const wasEdited = editedReviews[selectedIndex] !== undefined;

    try {
      await submitPublicReview({
        restaurantId: restaurant.id,
        qrCodeId: qr?.id || qrId,
        scanId,
        rating,
        selectedLabels,
        aiOptionShown: selectedIndex + 1,
        wasEdited,
        finalReview: selectedReview,
        regenerated: regenerations > 0,
        timeToSubmit,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.replace(/\D/g, "") || undefined,
      });

      // Robust clipboard — works on iOS Safari, HTTP, and all browsers
      const copied = await copyToClipboard(selectedReview);
      if (copied) {
        toast.success("Review copied! Paste it on Google and hit Post.");
      } else {
        toast.info("Review saved below — tap and hold to copy it.");
      }

      setSubmittedReview(selectedReview);

      confetti({
        particleCount: 140,
        spread: 70,
        origin: { y: 0.65 },
        colors: [restaurant.brand_color, "#ffffff"],
      });

      setSubmitted(true);

      // Only push to Google if rating is 4+ (positive reviews go public, negative stay internal)
      if (rating >= 4 && restaurant.google_place_id) {
        window.open(`https://search.google.com/local/writereview?placeid=${restaurant.google_place_id}`, "_blank");
      } else if (rating >= 4 && !restaurant.google_place_id) {
        toast.info("Review saved — Google Place ID not set yet.");
      }
      // rating < 4: review saved to dashboard only, no redirect
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already") || msg.includes("ALREADY")) {
        setAlreadySubmitted(true);
      } else {
        toast.error(msg || "Unable to submit review");
      }
    }
  };

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25 mb-6">
          <Check className="text-white w-10 h-10" />
        </motion.div>
        <h1 className="text-2xl font-black text-zinc-900 mb-3">Already submitted!</h1>
        <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
          You&apos;ve already shared your feedback for {restaurant?.name ?? "this restaurant"}. Thank you — it means a lot to them.
        </p>
        <p className="text-xs text-zinc-400 mt-4">You can leave another review after 24 hours.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (loadError || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-zinc-50">
        <div className="max-w-sm">
          <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star size={24} className="text-zinc-300" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Review page unavailable</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">{loadError || "Restaurant not found."}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const isPositive = rating >= 4;
    const isDemo = restaurant.id === "00000000-0000-0000-0000-000000000000";

    const handleCopyAgain = async () => {
      const ok = await copyToClipboard(submittedReview);
      if (ok) {
        setCopyAgainDone(true);
        toast.success("Copied again!");
        setTimeout(() => setCopyAgainDone(false), 2500);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50">
        {isPositive ? (
          <div className="max-w-sm w-full space-y-4">
            <div className="text-center space-y-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/25">
                <Check className="text-white w-8 h-8" />
              </motion.div>
              <h1 className="text-2xl font-black text-zinc-900">Thank you! 🎉</h1>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Your review is copied to clipboard. Open Google Maps and paste it — takes 10 seconds.
              </p>
            </div>

            {/* Review text — visible so iOS users can re-copy if clipboard was cleared */}
            {submittedReview && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Your review</p>
                <p className="text-sm text-zinc-700 leading-relaxed select-all">{submittedReview}</p>
                <button
                  onClick={handleCopyAgain}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-all"
                >
                  {copyAgainDone ? <><Check size={13} className="text-green-500" /> Copied!</> : <><Copy size={13} /> Tap to copy again</>}
                </button>
              </div>
            )}

            {isDemo ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800 text-center">
                <strong>Demo mode</strong> — In a real restaurant, Google Maps opens automatically.{" "}
                <a href="/" className="underline font-semibold">Get QuikReview →</a>
              </div>
            ) : restaurant.google_place_id ? (
              <a
                href={`https://search.google.com/local/writereview?placeid=${restaurant.google_place_id}`}
                target="_blank" rel="noreferrer" className="block"
              >
                <Button className="w-full gap-2 h-12 text-sm font-bold rounded-xl shadow-md shadow-primary/20">
                  Open Google Maps to Post
                  <ExternalLink size={15} />
                </Button>
              </a>
            ) : null}

            <p className="text-center text-xs text-zinc-400">
              Copied to clipboard · Switch to Google Maps · Paste · Hit Post
            </p>
          </div>
        ) : (
          <div className="max-w-sm w-full space-y-5 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/25">
              <Check className="text-white w-8 h-8" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-black text-zinc-900 mb-2">Feedback received</h1>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Your experience has been shared with the {restaurant.name} team. They take all feedback seriously.
              </p>
            </div>
            <div className="p-4 bg-zinc-100 rounded-2xl text-xs text-zinc-400 leading-relaxed">
              Your feedback is private and won&apos;t be posted publicly. Only restaurant management can see it.
            </div>
          </div>
        )}
      </div>
    );
  }

  const isDemo = restaurant.id === "00000000-0000-0000-0000-000000000000";

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      {isDemo && (
        <div className="bg-zinc-900 text-white/70 text-center text-[11px] font-medium py-2 px-4">
          Demo Mode · Reviews are not saved to Google
        </div>
      )}

      {/* Brand header */}
      <div className="h-44 w-full relative overflow-hidden" style={{ backgroundColor: restaurant.brand_color }}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-zinc-50 to-transparent" />
      </div>

      <div className="max-w-md mx-auto -mt-14 px-5 space-y-8 relative z-10">
        {/* Restaurant info */}
        <div className="flex flex-col items-center text-center space-y-3">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-zinc-50 shadow-xl bg-white">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-3xl" style={{ color: restaurant.brand_color, backgroundColor: `${restaurant.brand_color}15` }}>
                {restaurant.name[0]}
              </div>
            )}
          </motion.div>
          <div>
            <h1 className="text-xl font-black text-zinc-900">{restaurant.name}</h1>
            {qr?.table_number && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-500 mt-1">
                Table {qr.table_number}
              </span>
            )}
            <p className="text-sm text-zinc-500 mt-2 leading-snug">{qr?.custom_message || restaurant.qr_headline}</p>
          </div>
        </div>

        {/* Stars */}
        <div className="space-y-3">
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button key={star} whileTap={{ scale: 0.82 }} onClick={() => toggleRating(star)}
                className="focus:outline-none p-1" aria-label={`${star} star`}>
                <Star size={44} className={`transition-all duration-200 ${
                  star <= rating ? "text-amber-400 fill-amber-400 drop-shadow-sm" : "text-zinc-200"
                }`} />
              </motion.button>
            ))}
          </div>
          {rating > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center text-sm font-semibold text-zinc-700">
              {ratingLabels[rating - 1]}
            </motion.p>
          )}
        </div>

        <AnimatePresence>
          {rating > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <h2 className="text-base font-bold text-zinc-900 text-center">
                {rating >= 4 ? "What did you enjoy?" : "What could be better?"}
              </h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {visibleLabels.length === 0 ? (
                  <p className="text-sm text-zinc-400">No labels configured yet.</p>
                ) : (
                  visibleLabels.map((label) => {
                    const labelText = `${label.text}${label.emoji ? ` ${label.emoji}` : ""}`;
                    const isSelected = selectedLabels.includes(label.text);
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.text)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
                          isSelected
                            ? "text-white border-transparent shadow-md"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                        }`}
                        style={isSelected ? { backgroundColor: restaurant.brand_color, borderColor: restaurant.brand_color } : {}}
                      >
                        {labelText}
                      </button>
                    );
                  })
                )}
              </div>
              <Button
                size="lg"
                className="w-full h-13 text-sm font-bold rounded-2xl shadow-md"
                style={selectedLabels.length > 0 && !isGenerating ? { backgroundColor: restaurant.brand_color, borderColor: restaurant.brand_color } : {}}
                disabled={selectedLabels.length === 0 || isGenerating}
                onClick={() => handleGenerate(false)}
              >
                {isGenerating ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Writing your review...</>
                ) : (
                  "Generate Review Options →"
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {aiReviews.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Pick a review</h2>
                <Button variant="ghost" size="sm" onClick={() => handleGenerate(true)} disabled={isGenerating || regenerations >= 3}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {3 - regenerations} left
                </Button>
              </div>

              <Carousel className="w-full">
                <CarouselContent>
                  {aiReviews.map((review, index) => {
                    const text = editedReviews[index] || review;
                    const isSelected = selectedIndex === index;
                    return (
                      <CarouselItem key={`${review}-${index}`}>
                        <Card
                          className={`border-2 transition-all cursor-pointer rounded-lg ${
                            isSelected ? "border-primary bg-primary/5" : "border-border"
                          }`}
                          onClick={() => setSelectedIndex(index)}
                        >
                          <CardContent className="p-5 space-y-4">
                            {editingIndex === index ? (
                              <Textarea
                                value={text}
                                maxLength={1500}
                                className="min-h-48"
                                onChange={(event) =>
                                  setEditedReviews((current) => ({
                                    ...current,
                                    [index]: event.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <p className="text-base leading-relaxed">&quot;{text}&quot;</p>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">
                                {text.length} chars · {text.trim().split(/\s+/).filter(Boolean).length} words
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingIndex(editingIndex === index ? null : index);
                                  setSelectedIndex(index);
                                }}
                              >
                                <Edit2 className="mr-1 h-3 w-3" />
                                {editingIndex === index ? "Done" : "Edit"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <div className="flex justify-center gap-2 mt-4">
                  <CarouselPrevious className="static translate-y-0" />
                  <CarouselNext className="static translate-y-0" />
                </div>
              </Carousel>

              {/* Optional contact — shown once review is selected */}
              {selectedIndex !== null && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-50 rounded-2xl p-4 space-y-3 border border-zinc-100">
                  <p className="text-xs font-semibold text-zinc-500 text-center">
                    Want {restaurant.name} to reach out? <span className="text-zinc-400 font-normal">(optional)</span>
                  </p>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="📱 Mobile number"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    inputMode="tel"
                  />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="✉️ Email address"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    inputMode="email"
                  />
                  <p className="text-[10px] text-zinc-400 text-center leading-snug">
                    Shared only with this restaurant · Never used for spam
                  </p>
                </motion.div>
              )}

              <Button size="lg" className="w-full rounded-lg h-16 text-lg font-bold" disabled={!selectedReview} onClick={handleSubmit}>
                <Copy className="mr-2 h-6 w-6" />
                Post to Google
                <ExternalLink className="ml-2 h-4 w-4 opacity-70" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We copy your review and open Google Maps. Paste it there and tap Submit.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
