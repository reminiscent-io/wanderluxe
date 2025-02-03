import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EventEditFormProps {
  editData: {
    date: string;
    title: string;
    description: string;
    hotel: string;
    hotelDetails: string;
    accommodation_cost: string;
    accommodation_currency: string;
    transportation_cost: string;
    transportation_currency: string;
  };
  onEditDataChange: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];

const EventEditForm: React.FC<EventEditFormProps> = ({
  editData,
  onEditDataChange,
  onSubmit,
  onCancel
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          value={editData.date}
          onChange={(e) => onEditDataChange({ ...editData, date: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={editData.title}
          onChange={(e) => onEditDataChange({ ...editData, title: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={editData.description}
          onChange={(e) => onEditDataChange({ ...editData, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="hotel">Hotel</Label>
        <Input
          id="hotel"
          value={editData.hotel}
          onChange={(e) => onEditDataChange({ ...editData, hotel: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="hotelDetails">Hotel Details</Label>
        <Textarea
          id="hotelDetails"
          value={editData.hotelDetails}
          onChange={(e) => onEditDataChange({ ...editData, hotelDetails: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="accommodation_cost">Accommodation Cost</Label>
          <Input
            id="accommodation_cost"
            type="number"
            step="0.01"
            value={editData.accommodation_cost}
            onChange={(e) => onEditDataChange({ ...editData, accommodation_cost: e.target.value })}
            placeholder="Enter cost"
          />
        </div>
        <div>
          <Label htmlFor="accommodation_currency">Currency</Label>
          <Select
            value={editData.accommodation_currency}
            onValueChange={(value) => onEditDataChange({ ...editData, accommodation_currency: value })}
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transportation_cost">Transportation Cost</Label>
          <Input
            id="transportation_cost"
            type="number"
            step="0.01"
            value={editData.transportation_cost}
            onChange={(e) => onEditDataChange({ ...editData, transportation_cost: e.target.value })}
            placeholder="Enter cost"
          />
        </div>
        <div>
          <Label htmlFor="transportation_currency">Currency</Label>
          <Select
            value={editData.transportation_currency}
            onValueChange={(value) => onEditDataChange({ ...editData, transportation_currency: value })}
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
          type="submit"
          className="bg-earth-500 hover:bg-earth-600 text-white"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default EventEditForm;