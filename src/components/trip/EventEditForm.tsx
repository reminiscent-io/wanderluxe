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
    hotel_checkin_date: string;
    hotel_checkout_date: string;
    hotel_url: string;
    expense_type: string;
    expense_cost: string;
    expense_currency: string;
  };
  onEditDataChange: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];
const EXPENSE_TYPES = ["accommodation", "transportation", "activities", "other"];

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
      <div>
        <Label htmlFor="hotel_url">Hotel URL (optional)</Label>
        <Input
          id="hotel_url"
          type="url"
          value={editData.hotel_url}
          onChange={(e) => onEditDataChange({ ...editData, hotel_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hotel_checkin_date">Check-in Date</Label>
          <Input
            id="hotel_checkin_date"
            type="date"
            value={editData.hotel_checkin_date}
            onChange={(e) => onEditDataChange({ ...editData, hotel_checkin_date: e.target.value })}
            required={editData.hotel ? true : false}
          />
        </div>
        <div>
          <Label htmlFor="hotel_checkout_date">Check-out Date</Label>
          <Input
            id="hotel_checkout_date"
            type="date"
            value={editData.hotel_checkout_date}
            onChange={(e) => onEditDataChange({ ...editData, hotel_checkout_date: e.target.value })}
            required={editData.hotel ? true : false}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="expense_type">Expense Type</Label>
          <Select
            value={editData.expense_type}
            onValueChange={(value) => onEditDataChange({ ...editData, expense_type: value })}
          >
            <SelectTrigger className="bg-white border-gray-200">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              {EXPENSE_TYPES.map((type) => (
                <SelectItem 
                  key={type} 
                  value={type}
                  className="hover:bg-gray-100"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="expense_cost">Cost</Label>
          <Input
            id="expense_cost"
            type="number"
            step="0.01"
            value={editData.expense_cost}
            onChange={(e) => onEditDataChange({ ...editData, expense_cost: e.target.value })}
            placeholder="Enter cost"
          />
        </div>
        <div>
          <Label htmlFor="expense_currency">Currency</Label>
          <Select
            value={editData.expense_currency}
            onValueChange={(value) => onEditDataChange({ ...editData, expense_currency: value })}
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