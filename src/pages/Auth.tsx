import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signUpNotice, setSignUpNotice] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const pendingCode = sessionStorage.getItem('pendingInviteCode');
        if (pendingCode) {
          sessionStorage.removeItem('pendingInviteCode');
          navigate(`/invite/${pendingCode}`, { replace: true });
        } else {
          navigate("/");
        }
      }
    });
  }, [navigate]);

  const navigateAfterAuth = (delay = 0) => {
    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    if (pendingCode) {
      sessionStorage.removeItem('pendingInviteCode');
      const go = () => navigate(`/invite/${pendingCode}`, { replace: true });
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

      // Try sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        // Sign in succeeded
        setIsSliding(true);
        navigateAfterAuth(500);
        return;
      }

      // If email not confirmed, resend verification
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

      // If invalid credentials, try creating an account
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

      // Other sign-in error
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
      const pendingCode = sessionStorage.getItem('pendingInviteCode');
      const redirectUrl = pendingCode
        ? `${window.location.origin}/invite/${pendingCode}`
        : `${window.location.origin}/my-trips`;
      // Clear code here since OAuth redirects away from the page
      if (pendingCode) sessionStorage.removeItem('pendingInviteCode');

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
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2568&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-black/30" />
        {/* Unsplash attribution */}
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
        animate={isSliding ? { x: "-100%", opacity: 0 } : { x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-full max-w-md"
      >
        <Card className="relative bg-white/80 backdrop-blur-md border-0">
          <CardHeader className="pb-6">
            <CardTitle className="text-[28px] text-center text-[#2C2C2C]">
              Welcome to WanderLuxe
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[14px] text-[#4B5563] mb-2">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSignUpNotice(false); }}
                  required
                  autoComplete="email"
                  className="bg-white border border-[#D1D5DB] rounded-lg h-12 px-4 placeholder:text-[#9CA3AF] focus-visible:border-[#3B82F6] focus-visible:border-2 focus-visible:ring-[3px] focus-visible:ring-[rgba(59,130,246,0.1)]"
                />
                {signUpNotice && (
                  <div className="rounded-lg bg-[#F0EDE8] border border-[#D4CFC7] px-4 py-3 mt-1">
                    <p className="text-[14px] font-medium text-[#5C544A]">Account created!</p>
                    <p className="text-[13px] text-[#7B715F] mt-0.5">
                      Check your email for a confirmation link, then sign in.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[14px] text-[#4B5563] mb-2">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="bg-white border border-[#D1D5DB] rounded-lg h-12 px-4 pr-11 placeholder:text-[#9CA3AF] focus-visible:border-[#3B82F6] focus-visible:border-2 focus-visible:ring-[3px] focus-visible:ring-[rgba(59,130,246,0.1)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex justify-start mt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/auth/forgot-password")}
                    className="text-[14px] text-[#6B7280] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <Button
                  type="submit"
                  className={`w-full h-12 text-white transition-colors ${
                    password.length > 0
                      ? "bg-earth-600 hover:bg-earth-700 active:bg-earth-800"
                      : "bg-[#B0B0B0] hover:bg-[#B0B0B0] active:bg-[#B0B0B0] cursor-not-allowed"
                  }`}
                  disabled={loading || password.length === 0}
                >
                  Sign In / Sign Up
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 bg-white border-[1.5px] border-[#D1D5DB] text-[#374151] hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-colors"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                  Google
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
              <p className="text-[14px] text-center text-[#6B7280] mb-3">
                Not ready to sign up?
              </p>
              <div className="text-center">
                <button
                  type="button"
                  className="text-[15px] font-semibold text-[#8B6B47] hover:underline transition-all"
                  onClick={() => navigate("/explore")}
                >
                  Explore Public Trips
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
