import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ActivityFormProps {
  activity: {
    text: string;
    cost: string;
    currency: string;
  };
  onActivityChange: (activity: { text: string; cost: string; currency: string }) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];

const ActivityForm: React.FC<ActivityFormProps> = ({
  activity,
  onActivityChange,
  onSubmit,
  onCancel,
  submitLabel
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="activity">Activity Description</Label>
        <Input
          id="activity"
          value={activity.text}
          onChange={(e) => onActivityChange({ ...activity, text: e.target.value })}
          placeholder="Enter activity description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cost">Cost</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={activity.cost}
            onChange={(e) => onActivityChange({ ...activity, cost: e.target.value })}
            placeholder="Enter cost"
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={activity.currency}
            onValueChange={(value) => onActivityChange({ ...activity, currency: value })}
          >
            <SelectTrigger className="bg-white border-gray-200">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              {CURRENCIES.map((currency) => (
                <SelectItem 
                  key={currency} 
                  value={currency}
                  className="hover:bg-gray-100"
                >
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="text-gray-600"
        >
          Cancel
        </Button>
        <Button 
          type="button"
          onClick={onSubmit}
          className="bg-earth-500 hover:bg-earth-600 text-white"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};

export default ActivityForm;