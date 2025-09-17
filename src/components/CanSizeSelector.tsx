import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type CanSize = '12oz' | '16oz';

interface CanSizeSelectorProps {
  selectedSize: CanSize;
  onSizeChange: (size: CanSize) => void;
}

export const CanSizeSelector = ({ selectedSize, onSizeChange }: CanSizeSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">
        Choose Can Size
      </Label>
      <RadioGroup
        value={selectedSize}
        onValueChange={(value) => onSizeChange(value as CanSize)}
        className="flex gap-6"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="12oz" id="12oz" />
          <Label htmlFor="12oz" className="text-sm cursor-pointer">
            12oz Can
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="16oz" id="16oz" />
          <Label htmlFor="16oz" className="text-sm cursor-pointer">
            16oz Can
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};