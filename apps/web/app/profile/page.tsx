"use client";
import { authService } from "@/services/authService";
import { Card } from "@/components/ui/card";
import { AvatarFallback } from "@/components/ui/avatar";
import { Camera, User, Mail } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import { uploadFiles } from "@/lib/upload";
import Image from "next/image";
import { useRouter } from "next/navigation";

const AVATAR_SIZE = 96; // px

const ProfilePage = () => {
  const user = authService.getUser();
  console.log("ProfilePage user:", user);

  // State for edit form
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [photo, setPhoto] = useState(user?.photo || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(user?.photo || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // State for password reset
  const [resetting, setResetting] = useState(false);

  const getInitials = () => {
    if (!user) return "U";
    const name = user.name || `${user.firstName || ""} ${user.lastName || ""}`;
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase();
  };

  // Handle local photo preview
  const handlePhotoChange = (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let photoUrl = photo;
      if (photoFile) {
        const uploaded = await uploadFiles([
          { file: photoFile, type: "image" },
        ]);
        photoUrl =
          uploaded[0]?.file?.secure_url || uploaded[0]?.file?.url || "";
        if (!photoUrl) throw new Error("No URL returned from upload");
      }
      const updateData: {
        firstName: string;
        lastName: string;
        photo?: string;
      } = { firstName, lastName };
      if (photoUrl) updateData.photo = photoUrl;
      await authService.updateProfile(updateData);
      toast({ title: "Profile updated!" });
      setEditing(false);
    } catch (err) {
      toast({
        title: "Update failed",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle password reset request
  const handlePasswordReset = async () => {
    setResetting(true);
    try {
      await api.post("/api/auth/request-password-mail", {
        email: user.email,
        type: "forgot",
      });
      toast({ title: "Password reset email sent!" });
      localStorage.setItem("mailConfirmationRequested", "reset");
      await new Promise((resolve) => setTimeout(resolve, 200));
      router.push("/auth/post-register-mail-confirmation?type=reset");
    } catch (err) {
      toast({
        title: "Failed to send reset email",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  // Avatar rendering with next/image for auto scaling
  const AvatarImage = ({ src, alt }: { src?: string; alt?: string }) =>
    src ? (
      <Image
        src={src}
        alt={alt || "Profile photo"}
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        className="rounded-full object-cover"
        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        priority
      />
    ) : null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-background">
        <Navigation />
      </aside>
      <main className="flex-1">
        <div className="container mx-auto p-6 max-w-4xl">
          <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
          <Card className="p-6 mb-6">
            {user ? (
              editing ? (
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative h-24 w-24">
                      <div className="rounded-full overflow-hidden w-full h-full bg-muted flex items-center justify-center">
                        <AvatarImage
                          src={photoPreview || user.photo || user.avatar || ""}
                          alt={getInitials()}
                        />
                        {!photoPreview && !user.photo && !user.avatar && (
                          <AvatarFallback className="text-2xl">
                            {getInitials()}
                          </AvatarFallback>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoChange(file);
                        }}
                      />
                      <span
                        className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4 opacity-50" />
                      </span>
                    </div>
                    <div>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="mb-2"
                      />
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={uploading}>
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative h-24 w-24">
                      <div className="rounded-full overflow-hidden w-full h-full bg-muted flex items-center justify-center">
                        <AvatarImage
                          src={user.photo || user.avatar || ""}
                          alt={getInitials()}
                        />
                        {!user.photo && !user.avatar && (
                          <AvatarFallback className="text-2xl">
                            {getInitials()}
                          </AvatarFallback>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full">
                        <Camera className="h-4 w-4 opacity-50" />
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {user.name ||
                          `${user.firstName || ""} ${user.lastName || ""}`}
                      </h2>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Full Name:</span>
                      <span>
                        {user.name ||
                          `${user.firstName || ""} ${user.lastName || ""}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Phone:</span>
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.bio && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Bio:</span>
                        <span>{user.bio}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 mt-6">
                    <Button onClick={() => setEditing(true)}>
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePasswordReset}
                      disabled={resetting}
                    >
                      Reset Password
                    </Button>
                  </div>
                </>
              )
            ) : (
              <div className="text-center">
                <p className="text-lg text-muted-foreground">
                  {user === null
                    ? "No user info found. Please log in."
                    : "User object is present but missing required fields. Check localStorage and login flow."}
                </p>
                <pre className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
