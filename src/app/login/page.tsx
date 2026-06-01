"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center">Loading...</main>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(searchParams.get("next") || "/admin/dashboard");
    });
  }, [router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    router.replace(searchParams.get("next") || "/admin/dashboard");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email first"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setResetSent(true);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm shadow-orange-200">
            <span className="text-white font-black text-base">Q</span>
          </div>
          <span className="font-bold text-gray-900">QuikReview</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          {mode === "login" ? (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-900">Sign in</h1>
                <p className="text-sm text-gray-400 mt-1">Restaurant admin or super admin account</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@restaurant.com" className="h-10" required autoFocus />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                    <button type="button" onClick={() => setMode("reset")}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                      Forgot password?
                    </button>
                  </div>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className="h-10" required />
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 gap-2 font-bold">
                  <LogIn size={16} />
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </>
          ) : resetSent ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <Mail size={22} className="text-green-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Check your email</p>
                <p className="text-sm text-gray-400 mt-1">
                  We sent a password reset link to <strong>{email}</strong>
                </p>
              </div>
              <button onClick={() => { setMode("login"); setResetSent(false); }}
                className="text-sm text-orange-500 font-medium hover:text-orange-600 inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl font-black text-gray-900">Reset password</h1>
                <p className="text-sm text-gray-400 mt-1">We'll email you a reset link</p>
              </div>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@restaurant.com" className="h-10" required autoFocus />
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 gap-2 font-bold">
                  <Mail size={16} />
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
              <button onClick={() => setMode("login")}
                className="text-sm text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 font-medium">
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
