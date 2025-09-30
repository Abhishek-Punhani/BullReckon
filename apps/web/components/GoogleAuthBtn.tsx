import { toast } from "@/hooks/use-toast";
import { authService } from "@/services";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface GoogleAuthButtonProps {
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
}

const GoogleAuthButton = ({ style, ref }: GoogleAuthButtonProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error("No credential returned from Google");
      }
      setLoading(true);
      await authService.googleLogin({
        credential: credentialResponse.credential,
      });
    } catch (error) {
      console.error("Google auth failed:", error);
      toast({
        title: "Error",
        description: "There was an error logging in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    router.push("/");
  };

  const handleError = () => {
    //  console.log("Google login failed");
  };

  return (
    <div style={style} ref={ref}>
      <GoogleLogin onSuccess={handleSuccess} onError={handleError} useOneTap />
      {loading && <div>Loading ...</div>}
    </div>
  );
};

export default GoogleAuthButton;
