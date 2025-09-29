"use client";
import Link from "next/link";
import { MailCheck, CheckCircle2 } from "lucide-react";

const MailSentPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MailCheck className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              BullReckon
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Please verify your email address
          </p>
        </div>
        <div className="mt-8 bg-card border border-border rounded-xl shadow-lg p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Mail Sent!</h2>
          <p className="text-muted-foreground mb-6">
            We've sent a verification link to your email. Please check your
            inbox and follow the instructions to activate your account.
            <br />
            If you don't see the email, check your spam folder or try resending.
          </p>
          <Link
            href="/auth/login"
            className="inline-block w-full bg-primary text-primary-foreground font-medium rounded-lg px-5 py-3 hover:bg-primary/90 transition"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MailSentPage;
