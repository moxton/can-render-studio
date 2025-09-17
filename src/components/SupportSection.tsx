import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const SupportSection = () => {
  const handleBuyMeCoffee = () => {
    window.open('https://buymeacoffee.com/michaeloxton', '_blank');
    toast.success("Thanks for your support! ☕️");
  };

  return (
    <div className="mt-12 mb-8 flex justify-center">
      <Card className="p-4 bg-gradient-to-r from-pink-100 to-rose-100 border-2 border-pink-300 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          <p className="text-pink-700 font-medium text-center sm:text-left">
            Love this tool? Support the creator!
          </p>
          <div className="flex-shrink-0">
            <Button 
              onClick={handleBuyMeCoffee}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Coffee className="h-4 w-4 mr-2" />
              Buy Me a Coffee
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};