import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LogOut, User, Mail } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const AuthButton = () => {
  const { user, signInWithGoogle, signInWithMagicLink, signOut, loading } = useAuth();
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [email, setEmail] = useState("");

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success("Welcome! You now have 10 generations per day 🎉");
    } catch (error) {
      toast.error("Failed to sign in. Please try again.");
      console.error(error);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    
    try {
      await signInWithMagicLink(email);
      toast.success("Check your email for the sign-in link! 📧");
      setShowMagicLink(false);
      setEmail("");
    } catch (error) {
      toast.error("Failed to send magic link. Please try again.");
      console.error(error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">
            {user.user_metadata?.full_name || user.email}
          </span>
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="text-xs border-gray-300 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
        >
          <LogOut className="h-3 w-3 mr-1" />
          Sign Out
        </Button>
      </div>
    );
  }

  if (showMagicLink) {
    return (
      <div className="flex flex-col items-center gap-3">
        <form onSubmit={handleMagicLink} className="flex flex-col items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setShowMagicLink(false)}
              variant="outline"
              size="sm"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Link
            </Button>
          </div>
        </form>
        <p className="text-xs text-gray-500 text-center">
          We'll send you a secure sign-in link
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        <Button
          onClick={handleSignIn}
          variant="outline"
          className="px-4 py-2 border-purple-300 text-purple-700 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-200"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Google
        </Button>
        <Button
          onClick={() => setShowMagicLink(true)}
          variant="outline"
          className="px-4 py-2 border-purple-300 text-purple-700 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-200"
        >
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Sign in to get 10 generations per day
      </p>
    </div>
  );
};

interface AuthPromptProps {
  onSignIn: () => void;
}

export const AuthPrompt = ({ onSignIn }: AuthPromptProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 text-center">
      <div className="space-y-4">
        <div className="text-4xl">🔐</div>
        <h3 className="text-lg font-semibold text-purple-800">
          Free limit reached!
        </h3>
        <p className="text-purple-600 text-sm">
          Sign in with Google to get 10 generations per day!
        </p>
        <Button
          onClick={onSignIn}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Sign In with Google
        </Button>
        <p className="text-xs text-gray-500">
          Free Google authentication
        </p>
      </div>
    </Card>
  );
};