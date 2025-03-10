// Fetch trip data
  useEffect(() => {
    console.log("Fetching trip data for ID:", tripId);
    const fetchTripData = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*, accommodations(*)')
          .eq('trip_id', tripId)
          .single();

        if (error) throw error;

        // Ensure we have valid dates
        if (!data.arrival_date || !data.departure_date) {
          console.warn("Trip data missing dates, trying to fetch full trip data:", data);

          // Attempt to get dates specifically if they're missing
          const { data: dateData, error: dateError } = await supabase
            .from('trips')
            .select('arrival_date, departure_date')
            .eq('trip_id', tripId)
            .single();

          if (!dateError && dateData.arrival_date && dateData.departure_date) {
            console.log("Got dates in second query:", dateData);
            // Merge the date data with the original data
            data.arrival_date = dateData.arrival_date;
            data.departure_date = dateData.departure_date;
          }
        }

        console.log("Trip data fetched successfully:", data);
        setTripData(data);
      } catch (error) {
        console.error("Error fetching trip data:", error);
        toast.error('Failed to load trip data');
      }
    };

    if (tripId) {
      fetchTripData();
    }
  }, [tripId, supabase, toast]);