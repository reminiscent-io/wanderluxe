import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import BasicInfoFields from './event/form/BasicInfoFields';
import AccommodationFields from './event/form/AccommodationFields';
import ExpenseFields from './event/form/ExpenseFields';

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

const EventEditForm: React.FC<EventEditFormProps> = ({
  editData,
  onEditDataChange,
  onSubmit,
  onCancel
}) => {
  // Set expense type to 'accommodation' when hotel is present
  useEffect(() => {
    if (editData.hotel && editData.expense_type !== 'accommodation') {
      onEditDataChange({ ...editData, expense_type: 'accommodation' });
    }
  }, [editData.hotel]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <BasicInfoFields
        date={editData.date}
        title={editData.title}
        description={editData.description}
        onDateChange={(value) => onEditDataChange({ ...editData, date: value })}
        onTitleChange={(value) => onEditDataChange({ ...editData, title: value })}
        onDescriptionChange={(value) => onEditDataChange({ ...editData, description: value })}
      />

      <AccommodationFields
        hotel={editData.hotel}
        hotelDetails={editData.hotelDetails}
        hotelUrl={editData.hotel_url}
        checkinDate={editData.hotel_checkin_date}
        checkoutDate={editData.hotel_checkout_date}
        onHotelChange={(value) => onEditDataChange({ ...editData, hotel: value })}
        onHotelDetailsChange={(value) => onEditDataChange({ ...editData, hotelDetails: value })}
        onHotelUrlChange={(value) => onEditDataChange({ ...editData, hotel_url: value })}
        onCheckinDateChange={(value) => onEditDataChange({ ...editData, hotel_checkin_date: value })}
        onCheckoutDateChange={(value) => onEditDataChange({ ...editData, hotel_checkout_date: value })}
      />

      <ExpenseFields
        expenseType={editData.expense_type}
        expenseCost={editData.expense_cost}
        expenseCurrency={editData.expense_currency}
        onExpenseTypeChange={(value) => onEditDataChange({ ...editData, expense_type: value })}
        onExpenseCostChange={(value) => onEditDataChange({ ...editData, expense_cost: value })}
        onExpenseCurrencyChange={(value) => onEditDataChange({ ...editData, expense_currency: value })}
        hasHotel={!!editData.hotel}
      />

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