import { useState, useEffect } from "react";
import { Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { secureUsageService, SecureUsageStats } from "@/services/secureUsageService";
import { AuthPrompt } from "@/components/AuthButton";
export type CanSize = '12oz' | '16oz';

interface CanRendererProps {
  userImage: File | null;
  onGenerate: (userImage: File, canSize: CanSize) => Promise<string>;
}

export const CanRenderer = ({ userImage, onGenerate }: CanRendererProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [usageStats, setUsageStats] = useState<SecureUsageStats | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [selectedCanSize, setSelectedCanSize] = useState<CanSize>('12oz');
  const { user, signInWithGoogle } = useAuth();
  
  const isAnonymous = !user;

  // Load usage stats on component mount and user change
  useEffect(() => {
    loadUsageStats();
  }, [user]);

  const loadUsageStats = async () => {
    try {
      const stats = await secureUsageService.checkUsageLimit();
      setUsageStats(stats);
      
      // Show auth prompt if anonymous user is out of generations
      if (isAnonymous && !stats.canGenerate) {
        setShowAuthPrompt(true);
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      // Fallback stats when service fails
      setUsageStats({
        generationsUsed: 0,
        generationsRemaining: user ? 10 : 5,
        canGenerate: true,
        resetTime: new Date(new Date().setHours(24, 0, 0, 0)),
        isAuthenticated: !!user,
        maxGenerations: user ? 10 : 5,
        limitType: user ? 'authenticated' : 'anonymous'
      });
    }
  };

  const handleGenerate = async () => {
    if (!userImage) {
      toast.error("Please upload a design first!");
      return;
    }

    if (!usageStats?.canGenerate) {
      if (isAnonymous) {
        setShowAuthPrompt(true);
        return;
      } else {
        toast.error("Daily limit reached! Resets at midnight.");
        return;
      }
    }

    setIsGenerating(true);
    let success = false;
    let errorMessage: string | undefined;

    try {
      const resultUrl = await onGenerate(userImage, selectedCanSize);
      success = true;
      toast.success("Your can render is ready! 🎉");
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to generate can render. Please try again.");
      console.error(error);
    } finally {
      // Record the generation attempt
      try {
        await secureUsageService.recordGeneration(success, errorMessage);
        await loadUsageStats(); // Refresh usage stats
      } catch (recordError) {
        console.error('Failed to record generation:', recordError);
      }
      
      setIsGenerating(false);
    }
  };

  const handleAuthPromptSignIn = async () => {
    try {
      await signInWithGoogle();
      setShowAuthPrompt(false);
      await loadUsageStats(); // Refresh stats after sign in
      toast.success("Welcome! You now have 10 generations per day 🎉");
    } catch (error) {
      toast.error("Failed to sign in. Please try again.");
      console.error(error);
    }
  };



  const handleResetUsage = () => {
    secureUsageService.clearLocalData();
    toast.success("Usage reset! Refreshing...");
    setTimeout(() => window.location.reload(), 1000);
  };



  return (
    <div className="space-y-6">      
      {showAuthPrompt ? (
        <AuthPrompt onSignIn={handleAuthPromptSignIn} />
      ) : (
        <div className="text-center space-y-4">
          {/* Can Size Selection - Integrated into generation flow */}
          <div className="bg-gray-100 rounded-lg p-4 border border-gray-300 space-y-4">
            <div className="flex items-center justify-center gap-6">
              <span className="text-sm font-medium text-gray-800">Can Size:</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="canSize"
                    value="12oz"
                    checked={selectedCanSize === '12oz'}
                    onChange={(e) => setSelectedCanSize(e.target.value as CanSize)}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">12oz Can</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="canSize"
                    value="16oz"
                    checked={selectedCanSize === '16oz'}
                    onChange={(e) => setSelectedCanSize(e.target.value as CanSize)}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">16oz Can</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={handleGenerate}
                disabled={!userImage || isGenerating || !usageStats?.canGenerate}
                size="xl"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Generating {selectedCanSize} Mockup...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate {selectedCanSize} Mockup
                  </>
                )}
              </Button>
            </div>
            
            {usageStats && (
              <div className="space-y-2">
                {/* Usage Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      usageStats.generationsRemaining === 0
                        ? 'bg-red-500'
                        : usageStats.generationsRemaining <= 2
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${(usageStats.generationsUsed / usageStats.maxGenerations) * 100}%`
                    }}
                  />
                </div>
                
                {/* Usage Text */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>
                    {usageStats.generationsUsed} / {usageStats.maxGenerations} used
                  </span>
                  <span className="flex items-center gap-1">
                    {usageStats.isAuthenticated ? '🔐 Signed in' : '👤 Anonymous'}
                  </span>
                </div>
                
                {/* Status Message */}
                <div className="text-sm text-center">
                  {usageStats.canGenerate ? (
                    <span className="text-green-600 flex items-center justify-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      {usageStats.generationsRemaining} generations remaining
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1 text-red-600">
                      <Clock className="h-4 w-4" />
                      Daily limit reached - resets at midnight
                    </span>
                  )}
                </div>

                {/* Upgrade Message for Anonymous Users */}
                {!usageStats.isAuthenticated && usageStats.generationsRemaining <= 2 && (
                  <div className="text-xs text-center text-blue-600 bg-blue-50 rounded px-2 py-1">
                    💡 Sign in above to get {10 - usageStats.maxGenerations} more generations per day!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};