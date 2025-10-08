"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services";
import { Lock, Mail, TrendingUp } from "lucide-react";
import GoogleAuthButton from "@/components/GoogleAuthBtn";
import api from "@/lib/api";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Try to authenticate with BullReckon auth server
      const result = await authService.login(email, password);

      if (result.status === "success") {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        router.push("/dashboard");
      } else {
        throw new Error(result.message || "Login failed");
      }
    } catch (err) {
      console.log(err);
      toast({
        title: "Login failed",
        description: "Invalid email or password.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const user = await authService.getUser();
      await api.post("/api/auth/request-password-mail", { email: user.email });
      localStorage.setItem("mailConfirmationRequested", "forgot"); 
      await new Promise((resolve) => setTimeout(resolve, 200));
      router.push("/auth/post-register-mail-confirmation?type=forgot");
      toast({ title: "Password reset email sent!" });
    } catch (err) {
      toast({
        title: "Failed to send reset email",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              BullReckon
            </h1>
          </div>
          <p className="text-muted-foreground">
            Welcome to the future of trading
          </p>
        </div>

        {showForgot ? (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">Forgot Password</h2>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={forgotLoading} className="w-full">
                {forgotLoading ? "Sending..." : "Send Reset Email"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForgot(false)}
                className="w-full mt-2"
              >
                Back to Login
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="trading-gradient border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Sign In</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your trading account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="trader@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setShowForgot(true)}
                  className="w-full mt-2"
                >
                  Forgot Password?
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <p className="text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/register"
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
                <br />
                <GoogleAuthButton />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
