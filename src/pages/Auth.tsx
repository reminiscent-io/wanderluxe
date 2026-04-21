import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import LogoFromSupabase from "@/components/LogoFromSupabase";
import SEO from "@/components/SEO";

const isValidInviteCode = (code: string) => /^[a-zA-Z0-9_-]+$/.test(code);

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signUpNotice, setSignUpNotice] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const pendingCode = sessionStorage.getItem('pendingInviteCode');
        const pendingRedirect = sessionStorage.getItem('pendingRedirect');
        if (pendingCode && isValidInviteCode(pendingCode)) {
          sessionStorage.removeItem('pendingInviteCode');
          sessionStorage.removeItem('pendingRedirect');
          navigate(`/invite/${pendingCode}`, { replace: true });
        } else if (pendingRedirect && pendingRedirect.startsWith('/')) {
          sessionStorage.removeItem('pendingRedirect');
          navigate(pendingRedirect, { replace: true });
        } else {
          navigate("/");
        }
      }
    });
  }, [navigate]);

  const navigateAfterAuth = (delay = 0) => {
    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    const pendingRedirect = sessionStorage.getItem('pendingRedirect');
    if (pendingCode && isValidInviteCode(pendingCode)) {
      sessionStorage.removeItem('pendingInviteCode');
      sessionStorage.removeItem('pendingRedirect');
      const go = () => navigate(`/invite/${pendingCode}`, { replace: true });
      delay ? setTimeout(go, delay) : go();
    } else if (pendingRedirect && pendingRedirect.startsWith('/')) {
      sessionStorage.removeItem('pendingRedirect');
      const go = () => navigate(pendingRedirect, { replace: true });
      delay ? setTimeout(go, delay) : go();
    } else {
      const go = () => navigate("/my-trips");
      delay ? setTimeout(go, delay) : go();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        setIsSliding(true);
        navigateAfterAuth(500);
        return;
      }

      if (signInError.message?.toLowerCase().includes("email not confirmed")) {
        await supabase.auth.resend({ type: "signup", email });
        toast({
          title: "Email not verified",
          description:
            "We've sent a new verification link to your email. Please check your inbox and try again.",
        });
        setLoading(false);
        return;
      }

      if (signInError.message?.toLowerCase().includes("invalid login credentials")) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.user) {
          setSignUpNotice(true);
        }

        setLoading(false);
        return;
      }

      throw signInError;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
        className: "bg-earth-100/50 border-destructive",
      });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const pendingCode = sessionStorage.getItem('pendingInviteCode');
      const pendingRedirect = sessionStorage.getItem('pendingRedirect');
      let redirectUrl: string;
      if (pendingCode && isValidInviteCode(pendingCode)) {
        redirectUrl = `${window.location.origin}/invite/${pendingCode}`;
      } else if (pendingRedirect && pendingRedirect.startsWith('/')) {
        redirectUrl = `${window.location.origin}${pendingRedirect}`;
      } else {
        redirectUrl = `${window.location.origin}/my-trips`;
      }
      sessionStorage.removeItem('pendingInviteCode');
      sessionStorage.removeItem('pendingRedirect');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
        className: "bg-earth-100/50 border-destructive",
      });
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <SEO title="Sign in" noIndex />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2568&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat">
        {/* Warm editorial overlay: sunset-tinted gradient for brand feel */}
        <div className="absolute inset-0 bg-gradient-to-br from-earth-900/50 via-earth-800/40 to-sunset-900/40" />
        <div className="absolute inset-0 bg-earth-950/20" />
        <div className="absolute bottom-3 left-3 z-10 text-white text-xs bg-black/40 px-2 py-1 rounded backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity">
          <a
            href="https://unsplash.com/@gaddafirusli?utm_source=wanderluxe&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Gaddafi Rusli
          </a>
          {' / '}
          <a
            href="https://unsplash.com?utm_source=wanderluxe&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Unsplash
          </a>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isSliding ? { x: "-100%", opacity: 0 } : { x: 0, y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="relative w-full max-w-md"
      >
        {/* Wordmark above the card */}
        <div className="flex justify-center mb-6">
          <LogoFromSupabase
            logoName="White Full"
            className="h-9 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            fallbackText="WanderLuxe"
            fallbackClassName="font-display text-2xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
          />
        </div>

        <div className="relative rounded-card bg-sand-50/92 backdrop-blur-xl border border-sand-200/60 shadow-warm-xl overflow-hidden">
          {/* Subtle grain texture for editorial feel */}
          <div className="absolute inset-0 bg-grain opacity-[0.4] pointer-events-none" />

          <div className="relative px-7 pt-8 pb-7 sm:px-9 sm:pt-10 sm:pb-9">
            <div className="text-center mb-7">
              <h1 className="font-display text-[30px] leading-tight text-earth-600">
                Welcome <em className="not-italic text-sunset-600 font-display italic">back</em>
              </h1>
              <p className="mt-1.5 text-[14px] text-sand-600">
                Sign in to pick up where you left off.
              </p>
            </div>

            {/* Google first — higher converting placement */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 bg-white hover:bg-sand-50 border-sand-200 text-earth-700 font-medium shadow-warm-sm transition-colors"
              onClick={handleGoogleSignIn}
              disabled={busy}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-sand-200" />
              <span className="text-[12px] uppercase tracking-[0.14em] text-sand-500">or</span>
              <div className="flex-1 h-px bg-sand-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium text-earth-600">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSignUpNotice(false); }}
                  required
                  autoComplete="email"
                  className="bg-white border border-sand-200 rounded-lg h-12 px-4 text-earth-600 placeholder:text-sand-500 focus-visible:border-sunset-400 focus-visible:ring-[3px] focus-visible:ring-sunset-200/60 focus-visible:ring-offset-0 transition-colors"
                />
                {signUpNotice && (
                  <div className="rounded-lg bg-sunset-50 border border-sunset-200 px-4 py-3 mt-2">
                    <p className="text-[14px] font-medium text-earth-600">Account created!</p>
                    <p className="text-[13px] text-sand-600 mt-0.5">
                      Check your email for a confirmation link, then sign in.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password" className="text-[13px] font-medium text-earth-600">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/forgot-password")}
                    className="text-[12px] text-sand-600 hover:text-sunset-600 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="bg-white border border-sand-200 rounded-lg h-12 px-4 pr-11 text-earth-600 placeholder:text-sand-500 focus-visible:border-sunset-400 focus-visible:ring-[3px] focus-visible:ring-sunset-200/60 focus-visible:ring-offset-0 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-500 hover:text-earth-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="sunset"
                className="w-full h-12 text-[15px] font-medium mt-2"
                disabled={busy || password.length === 0 || email.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>

              <p className="text-[12px] text-center text-sand-600 pt-1">
                New here? We'll create your account automatically.
              </p>
            </form>
          </div>

          {/* Footer strip: secondary exploration path */}
          <div className="relative border-t border-sand-200/70 bg-sand-100/60 px-7 py-4 sm:px-9 text-center">
            <button
              type="button"
              className="text-[13px] text-earth-600 hover:text-sunset-600 transition-colors"
              onClick={() => navigate("/explore")}
            >
              Not ready to sign up?{" "}
              <span className="font-medium underline-offset-4 hover:underline">
                Explore public trips →
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
