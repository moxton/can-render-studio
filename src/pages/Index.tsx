import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { CanRenderer } from "@/components/CanRenderer";
import { MockupDisplay } from "@/components/MockupDisplay";
import { SupportSection } from "@/components/SupportSection";
import { AuthButton } from "@/components/AuthButton";
import { AdminDashboard } from "@/components/AdminDashboard";
import { DeploymentStatus } from "@/components/DeploymentStatus";
import { FeedbackForm } from "@/components/FeedbackForm";
import { generateCanRender } from "@/services/imageGeneration";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Zap, Bot, Download, Settings } from "lucide-react";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { user } = useAuth();

  // Admin check using environment variable
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',') || ['moxton@gmail.com'];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setGeneratedImage(null);
  };

  const handleGenerate = async (file: File, options: GenerateOptions) => {
    try {
      console.log('Starting generation with:', { fileName: file.name, options });
      const result = await generateCanRender(file, options);
      console.log('Generation successful:', result);
      setGeneratedImage(result);
      return result;
    } catch (error) {
      console.error('Generation failed in Index.tsx:', error);
      throw error; // Re-throw so CanRenderer can handle it
    }
  };

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            {/* Top Bar - Admin Only */}
            {isAdmin && (
              <div className="flex justify-start items-center gap-2">
                <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                  Admin
                </div>
                <Button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  {showAdminPanel ? 'Hide Panel' : 'Admin Panel'}
                </Button>
              </div>
            )}

            {/* Main Title */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                Can Render Studio
              </h1>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
                Upload any image or label and get a a profesisonal 3-angle can render in seconds. Perfect for marketing, prototyping, and presentations.
              </p>
            </div>

            {/* Auth Section */}
            <div className="flex justify-center">
              <AuthButton />
            </div>
          </div>

          {/* Admin Dashboard */}
          {isAdmin && showAdminPanel && (
            <div className="space-y-6">
              <DeploymentStatus />
              <AdminDashboard />
            </div>
          )}

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="p-6 bg-white border border-gray-200 shadow-lg">
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Your Design
                  </h2>
                </div>

                <FileUpload
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onRemove={handleFileRemove}
                />
              </div>
            </Card>

            {/* Mockup Section */}
            <Card className="p-6 bg-white border border-gray-200 shadow-lg">
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Your Mockup
                  </h2>
                </div>

                <MockupDisplay generatedImage={generatedImage} />
              </div>
            </Card>
          </div>

          {/* Generation Controls */}
          <div className="max-w-md mx-auto">
            <CanRenderer
              userImage={selectedFile}
              onGenerate={handleGenerate}
            />
          </div>

          
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center items-center gap-4">
            <p className="text-sm text-gray-600">
              Created by Michael Oxton, 2025
            </p>
            <FeedbackForm variant="support" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;