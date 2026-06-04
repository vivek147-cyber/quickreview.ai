"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, QrCode, BarChart3, Smartphone, ArrowRight, Star,
  Check, RefreshCw, Brain, Shield, MessageSquareHeart, X,
  ChevronRight,
} from "lucide-react";

// ─── Demo ────────────────────────────────────────────────────────────────────

const DEMO_STEPS = [
  { id: "scan", label: "Scan QR code" },
  { id: "rate", label: "Pick a rating" },
  { id: "labels", label: "Choose highlights" },
  { id: "ai", label: "AI writes options" },
  { id: "copy", label: "Copy & post" },
];

const DEMO_REVIEWS = [
  "The biriyani here is genuinely exceptional — fragrant, perfectly spiced, generous portions. Service was attentive and staff were warm throughout. Will absolutely be back.",
  "Loved the ambiance and the food quality. The biriyani was cooked to perfection, and the team made us feel welcome from start to finish. Highly recommend.",
  "Really enjoyed Spice Garden. The biriyani stands out as one of the best I've had in the city. Great value, great service — a must visit.",
];

const DEMO_LABELS = ["Biriyani", "Great Ambiance", "Fast Service", "Friendly Staff", "Value for Money"];

function PhoneDemo() {
  const [step, setStep] = useState(0);
  const [, setRating] = useState(0);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedReview, setSelectedReview] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(true);

  useEffect(() => {
    if (!autoPlaying) return;
    const timings: Record<number, number> = { 0: 1800, 1: 1200, 2: 2000, 3: 2200, 4: 0 };
    const timer = setTimeout(() => {
      if (step === 0) { setStep(1); setRating(5); }
      else if (step === 1) { setStep(2); setSelectedLabels(["Biriyani", "Great Ambiance"]); }
      else if (step === 2) { setStep(3); setGenerating(true); setTimeout(() => setGenerating(false), 1400); }
      else if (step === 3) { setStep(4); }
      else if (step === 4) { setTimeout(() => reset(), 3000); }
    }, timings[step] ?? 1800);
    return () => clearTimeout(timer);
  }, [step, autoPlaying]);

  const reset = () => {
    setStep(0); setRating(0); setSelectedLabels([]);
    setGenerating(false); setSelectedReview(0); setAutoPlaying(true);
  };

  const go = (i: number) => {
    setAutoPlaying(false); setStep(i);
    if (i <= 1) { setRating(i === 1 ? 5 : 0); setSelectedLabels([]); setGenerating(false); }
    if (i === 2) setSelectedLabels(["Biriyani", "Great Ambiance"]);
    if (i === 3) setGenerating(false);
  };

  return (
    <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
      {/* Step list */}
      <div className="w-full lg:w-52 space-y-1.5 shrink-0 lg:pt-4">
        {DEMO_STEPS.map((s, i) => (
          <button key={s.id} onClick={() => go(i)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm transition-all ${
              step === i ? "bg-orange-500 text-white font-semibold shadow-md shadow-orange-200"
              : step > i ? "bg-green-50 text-green-700 font-medium"
              : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            }`}>
            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
              step > i ? "bg-green-500 text-white" : step === i ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              {step > i ? <Check size={9} /> : i + 1}
            </span>
            {s.label}
          </button>
        ))}
        <button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full">
          <RefreshCw size={10} /> Replay
        </button>
      </div>

      {/* Phone */}
      <div className="mx-auto lg:mx-0">
        <div className="w-[300px] rounded-[2.2rem] border-[9px] border-gray-900 bg-white shadow-2xl overflow-hidden">
          <div className="bg-gray-900 h-6 flex items-center justify-center">
            <div className="w-14 h-3 bg-gray-800 rounded-full" />
          </div>
          <div className="h-[520px] bg-gray-50 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  className="h-full flex flex-col items-center justify-center gap-5 p-6 text-center bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                    <QrCode size={28} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Spice Garden</p>
                    <p className="text-base font-bold text-gray-900 leading-snug">How was your experience?</p>
                    <p className="text-xs text-gray-400 mt-1">Under 60 seconds</p>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={26} className="text-gray-100" />)}
                  </div>
                </motion.div>
              )}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center gap-5 p-6 text-center bg-white">
                  <p className="text-base font-bold text-gray-900">How was your experience?</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.07, type: "spring" }}>
                        <Star size={30} className="text-amber-400 fill-amber-400" />
                      </motion.div>
                    ))}
                  </div>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="text-sm font-semibold text-green-600 bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
                    Excellent! ✨
                  </motion.p>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="h-full p-5 bg-white flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">What stood out?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEMO_LABELS.map((l, i) => (
                      <motion.span key={l} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          selectedLabels.includes(l) ? "bg-orange-500 text-white border-orange-500" : "bg-white border-gray-200 text-gray-600"
                        }`}>{l}</motion.span>
                    ))}
                  </div>
                  {selectedLabels.length > 0 && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-auto w-full py-3 bg-orange-500 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200">
                      Generate My Review →
                    </motion.button>
                  )}
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full p-4 bg-white flex flex-col gap-2.5">
                  {generating ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                        <Brain size={20} className="text-orange-500 animate-pulse" />
                      </div>
                      <p className="text-xs text-gray-500">Writing your review...</p>
                      <div className="flex gap-1">
                        {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pick a review:</p>
                      {DEMO_REVIEWS.slice(0, 2).map((r, i) => (
                        <motion.button key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          onClick={() => setSelectedReview(i)}
                          className={`text-left p-3 rounded-xl border text-[11px] leading-relaxed transition-all ${
                            selectedReview === i ? "border-orange-400 bg-orange-50" : "border-gray-100 bg-gray-50"
                          }`}>
                          {r.slice(0, 90)}...{selectedReview === i && <span className="text-orange-500 font-bold ml-1">✓</span>}
                        </motion.button>
                      ))}
                    </>
                  )}
                </motion.div>
              )}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center bg-white">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220 }}
                    className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                    <Check size={26} className="text-white" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Review copied!</p>
                    <p className="text-xs text-gray-400 mt-1">Paste it on Google Maps and post.</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
                  </div>
                  <button className="w-full py-2.5 bg-[#4285f4] text-white rounded-xl text-xs font-bold">
                    Open Google Review
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: QrCode, title: "Branded QR Codes", desc: "Print-ready codes with your logo and colors. Place them anywhere — counter, table, receipt, packaging." },
  { icon: Brain, title: "AI Review Writing", desc: "Writes 4 natural, authentic review options in under 2 seconds. Customers just pick one." },
  { icon: MessageSquareHeart, title: "One-Tap to Google", desc: "Review is auto-copied. Google Maps opens directly to your listing. Customer just pastes." },
  { icon: BarChart3, title: "Smart Analytics", desc: "Track ratings, completion rate, label trends, and review velocity in real time." },
  { icon: Zap, title: "47-Second Flow", desc: "No app download. No account creation. Scan → review → posted in under a minute." },
  { icon: Shield, title: "Reputation Guard", desc: "4★+ reviews go to Google. Lower ratings stay private for your team only — protect your reputation." },
];

const PAIN_POINTS = [
  { bad: "Customers forget to review by the time they get home", good: "QR at the point of experience captures the moment while the feeling is fresh" },
  { bad: "Most customers have no idea what to write on Google", good: "AI writes 4 options tailored to their rating. They just pick and post." },
  { bad: "WhatsApp review blasts feel spammy and get ignored", good: "Customer-initiated, in-person flow. No opt-ins, no spam, zero push." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-[var(--font-geist-sans)]">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm shadow-orange-200">
              <span className="text-white font-black text-sm">Q</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">QuikReview</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {["#how", "#demo", "#features"].map((href, i) => (
              <a key={href} href={href} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                {["How it works", "Demo", "Features"][i]}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-2">
              Login
            </Link>
            <Link href="/login"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow-sm shadow-orange-200">
              Get Started Free
            </Link>
          </div>

          <button className="md:hidden p-2 text-gray-500 hover:text-gray-900" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <div className="w-5 space-y-1.5"><div className="h-0.5 bg-current" /><div className="h-0.5 bg-current" /></div>}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
            {["How it works", "Demo", "Features"].map((label, i) => (
              <a key={label} href={["#how", "#demo", "#features"][i]} className="block text-sm font-medium text-gray-600 py-1" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <Link href="/login" className="block w-full text-center bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl mt-2">
              Get Started Free
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        {/* Soft orange radial behind headline */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_top,_#fff7ed_0%,_transparent_65%)]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-28 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="badge-orange mb-8 inline-flex">
              <Zap size={11} /> AI-powered · Works for any local business
            </span>

            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-gray-900 mb-6">
              Turn Every Happy<br />
              Customer Into a{" "}
              <span className="text-orange-gradient">5-Star</span>
              <br />Review.
            </h1>

            <p className="text-lg md:text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed font-normal">
              Customer scans your QR, picks a rating, and AI writes their Google review.
              Copied and posted in under 60 seconds. No app needed.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#demo"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-8 py-3.5 rounded-2xl transition-colors shadow-lg shadow-orange-200 group">
              See Live Demo
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
            <Link href="/r/example"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-bold text-base px-8 py-3.5 rounded-2xl border border-gray-200 transition-colors">
              <Smartphone size={17} />
              Try Customer Flow
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            className="mt-20 flex flex-wrap justify-center gap-x-16 gap-y-6">
            {[
              { n: "8×", l: "more reviews vs. asking manually" },
              { n: "47s", l: "avg time from scan to posted" },
              { n: "4.7★", l: "avg rating across platform" },
              { n: "0", l: "app downloads required" },
            ].map(s => (
              <div key={s.l} className="text-center">
                <p className="text-4xl font-black text-orange-500 tabular-nums">{s.n}</p>
                <p className="text-xs text-gray-400 mt-1 font-medium max-w-[120px] mx-auto leading-snug">{s.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-4">The Problem</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-5 leading-tight">
              Getting reviews shouldn&apos;t<br className="hidden md:block" /> feel like begging.
            </h2>
            <p className="text-gray-500 text-base max-w-md mx-auto leading-relaxed">
              Most businesses leave reviews to chance. QuikReview makes it a repeatable system.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PAIN_POINTS.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-2.5 mb-4 p-3 bg-red-50 rounded-xl">
                  <X size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700 leading-snug">{item.bad}</p>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-green-50 rounded-xl">
                  <Check size={13} className="text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-800 font-medium leading-snug">{item.good}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-4">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-tight">
              Four steps. One new review.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { n: "01", icon: QrCode, t: "Scan QR", d: "Customer scans the code at your counter, table, or door. No app, no login." },
              { n: "02", icon: Star, t: "Rate & Tag", d: "Taps a star rating and picks what they loved." },
              { n: "03", icon: Brain, t: "AI Writes", d: "AI generates 4 natural review options in 2 seconds." },
              { n: "04", icon: MessageSquareHeart, t: "Post to Google", d: "Copies and posts directly on Google Maps." },
            ].map(({ n, icon: Icon, t, d }, i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 shadow-sm">
                  <Icon size={22} className="text-orange-500" />
                </div>
                <span className="text-[10px] font-bold text-orange-400 tracking-[0.2em] mb-2">{n}</span>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{t}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo ── */}
      <section id="demo" className="py-24 bg-[#fffbf8]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold mb-6 border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live Interactive Demo
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4 leading-tight">
              See the customer experience
            </h2>
            <p className="text-gray-500 text-base max-w-md mx-auto">
              This is exactly what your customers see when they scan your QR code.
            </p>
          </div>

          <PhoneDemo />

          <div className="mt-12 text-center">
            <Link href="/r/example"
              className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors border border-orange-200 bg-orange-50 hover:bg-orange-100 px-5 py-2.5 rounded-xl">
              <Smartphone size={15} />
              Try the real thing on your phone
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-4">Features</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-tight mb-4">
              Everything you need.<br className="hidden md:block" /> Nothing you don&apos;t.
            </h2>
            <p className="text-gray-500 text-base max-w-sm mx-auto">Restaurants, salons, clinics, hotels, retail — any business with walk-in customers.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-orange-100 hover:shadow-lg hover:shadow-orange-50 hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-orange-500" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-orange-500 px-10 py-16 text-center shadow-2xl shadow-orange-200">
            {/* Background orbs */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-400/40 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-600/30 rounded-full blur-3xl" />

            <div className="relative z-10">
              <p className="text-orange-100 text-xs font-bold uppercase tracking-[0.2em] mb-4">Get Started</p>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5">
                Start getting 5-star<br />reviews today.
              </h2>
              <p className="text-orange-100 text-base mb-10 max-w-sm mx-auto leading-relaxed">
                Setup takes 5 minutes. Your first QR code is ready immediately. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white text-orange-600 font-bold text-sm px-8 py-3.5 rounded-2xl hover:bg-orange-50 transition-colors shadow-md">
                  Get Started Free
                  <ArrowRight size={16} />
                </Link>
                <Link href="/r/example"
                  className="inline-flex items-center justify-center gap-2 bg-orange-400/30 text-white font-semibold text-sm px-8 py-3.5 rounded-2xl hover:bg-orange-400/40 transition-colors border border-white/20">
                  Try Demo First
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">Q</span>
            </div>
            <span className="font-bold text-sm text-gray-900">QuikReview.ai</span>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-700 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Privacy</a>
            <Link href="/login" className="hover:text-gray-700 transition-colors">Login</Link>
          </div>
          <p className="text-xs text-gray-400">© 2025 QuikReview.ai · All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
