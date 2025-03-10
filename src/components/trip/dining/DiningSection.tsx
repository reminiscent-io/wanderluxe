<AddReservationDialog 
        isOpen={isAddingReservation}
        onOpenChange={setIsAddingReservation}
        onReservationAdded={refetchReservations}
        tripId={tripId}
      />