/**
 * @deprecated This component is deprecated. Use components from the Accommodations folder instead.
 * This will be removed in a future version.
 */
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
    hotel_details: string;
    hotel_checkin_date: string;
    hotel_checkout_date: string;
    hotel_url: string;
    expense_type: string;
    expense_cost: number;
    currency: string;
    hotel_address?: string; 
    hotel_phone?: string;
    hotel_place_id?: string;
    hotel_website?: string;
    expense_paid?: boolean;
    expense_date?: string;
    order_index?: number;
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

  // If there's a hotel stay that overlaps with this date but no hotel set for this event,
  // we should show the hotel information in a disabled state
  const isExistingHotelStay = editData.hotel && 
    editData.hotel_checkin_date && 
    editData.hotel_checkout_date && 
    editData.date >= editData.hotel_checkin_date && 
    editData.date < editData.hotel_checkout_date;

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
        hotelDetails={editData.hotel_details}
        hotelUrl={editData.hotel_url}
        checkinDate={editData.hotel_checkin_date}
        checkoutDate={editData.hotel_checkout_date}
        onHotelChange={(value) => onEditDataChange({ ...editData, hotel: value })}
        onHotelDetailsChange={(value) => onEditDataChange({ ...editData, hotel_details: value })}
        onHotelUrlChange={(value) => onEditDataChange({ ...editData, hotel_url: value })}
        onCheckinDateChange={(value) => onEditDataChange({ ...editData, hotel_checkin_date: value })}
        onCheckoutDateChange={(value) => onEditDataChange({ ...editData, hotel_checkout_date: value })}
        isExistingStay={isExistingHotelStay}
      />

      <ExpenseFields
        expenseType={editData.expense_type}
        expenseCost={editData.expense_cost}
        expenseCurrency={editData.currency}
        onExpenseTypeChange={(value) => onEditDataChange({ ...editData, expense_type: value })}
        onExpenseCostChange={(value) => onEditDataChange({ ...editData, expense_cost: value })}
        onExpenseCurrencyChange={(value) => onEditDataChange({ ...editData, currency: value })}
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
