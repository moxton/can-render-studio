import { Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MockupDisplayProps {
  generatedImage: string | null;
}

export const MockupDisplay = ({ generatedImage }: MockupDisplayProps) => {
  const handleDownload = async () => {
    if (!generatedImage) return;
    
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'can-render.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Downloaded! 📁");
    } catch (error) {
      toast.error("Failed to download. Please try again.");
    }
  };

  const handleCopy = async () => {
    if (!generatedImage) return;
    
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      toast.success("Copied to clipboard! 📋");
    } catch (error) {
      toast.error("Failed to copy. Please try downloading instead.");
    }
  };

  if (generatedImage) {
    return (
      <div className="space-y-4">
        <div className="text-center px-4">
          <img 
            src={generatedImage} 
            alt="Generated can mockup - 3 angles" 
            className="w-full max-w-2xl mx-auto rounded-lg shadow-lg border border-gray-200"
          />
          <p className="text-sm text-gray-500 mt-2">
            Left view • Front view • Right view
          </p>
        </div>
        
        <div className="flex gap-3 justify-center flex-wrap">
          <Button 
            onClick={handleDownload}
            size="lg"
            className="px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={handleCopy}
            variant="outline"
            size="lg"
            className="px-6 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-gray-800 mb-2">
            Your can render will appear here
          </p>
          <p className="text-gray-500">
            Three angles will be generated
          </p>
        </div>
      </div>
    </div>
  );
};