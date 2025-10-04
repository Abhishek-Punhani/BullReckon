"use client";
import { useState } from "react";
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
import { TrendingUp, Mail, Lock, User, Image as ImageIcon } from "lucide-react";
import { uploadFiles } from "@/lib/upload";
import Image from "next/image";
import { authService } from "@/services";
import GoogleAuthButton from "@/components/GoogleAuthBtn";

const RegisterPage = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let photoUrl: string | null = null;

      // if photo selected → upload to Cloudinary
      if (image) {
        const uploaded = await uploadFiles([
          { file: image, type: "image", message: "profile" },
        ]);
        photoUrl = uploaded[0]?.file?.secure_url || null;
      }
      const result = await authService.register(
        email,
        password,
        firstName,
        lastName,
        photoUrl || undefined
      );

      if (result.status === "success") {
        toast({
          title: "Registration successful!",
          description: "Please check your email to verify your account.",
        });
      } else {
        throw new Error(result.message || "Registration failed");
      }
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      router.push("/auth/post-register-mail-confirmation?type=activate");
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
          <p className="text-muted-foreground">Create your trading account</p>
        </div>

        <Card className="trading-gradient border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Enter your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Optional Profile Photo */}
              <div className="space-y-2">
                <Label htmlFor="photo" className="font-medium">
                  Profile Photo{" "}
                  <span className="text-xs text-muted-foreground">
                    (Optional)
                  </span>
                </Label>
                <div className="relative flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                    {image ? (
                      <Image
                        src={URL.createObjectURL(image)}
                        alt="Profile Preview"
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary pl-0"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setImage(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                {image && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline mt-1"
                    onClick={() => setImage(null)}
                  >
                    Remove photo
                  </button>
                )}
              </div>
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required
                    minLength={2}
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-10"
                    required
                    minLength={2}
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Password */}
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
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Must contain at least one uppercase letter, one lowercase
                  letter, and one number.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing up..." : "Sign Up"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
              <br />
              <GoogleAuthButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
