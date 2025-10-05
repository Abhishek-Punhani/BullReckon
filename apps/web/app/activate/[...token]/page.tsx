"use client";
import axios from "axios";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { API_CONFIG } from "@/config";

export default function ActivateEmail() {
  const router = useRouter();
  const params = useParams();
  const token = Array.isArray(params.token)
    ? params.token.join("")
    : params.token;
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      async function verifyToken() {
        try {
          const res = await axios.post(
            `${API_CONFIG.AUTH_SERVER}/api/auth/verify-email`,
            { token }
          );
          if (res.status === 200) {
            toast({
              title: "Email Verified",
              description: "You can now login to your account.",
            });
          } else {
            throw new Error("Verification failed");
          }
        } catch (error: any) {
          toast({
            title: "Error",
            description:
              error?.response?.data?.message || "Failed to verify email.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
      verifyToken();
    }
  }, [token, toast]);

  useEffect(() => {
    if (!loading) {
      router.replace("/auth/login");
    }
  }, [loading, router]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      Loading ...
    </div>
  );
}
