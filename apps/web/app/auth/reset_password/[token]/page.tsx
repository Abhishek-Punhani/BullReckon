"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import api from "@/lib/api";

const ResetPasswordPage = () => {
  const router = useRouter();
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/change-password", {
        token,
        newPassword,
      });
      toast({ title: "Password changed successfully!" });
      router.push("/auth/login");
    } catch (err: any) {
      toast({
        title: "Failed to reset password",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
