import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Plane } from "lucide-react";

interface FlightCardProps {
  type: "outbound" | "return";
  flightNumber: string;
  route: string;
  date: string;
  departure: string;
  arrival: string;
}

const FlightCard = ({ type, flightNumber, route, date, departure, arrival }: FlightCardProps) => {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">{type === "outbound" ? "Outbound Flight" : "Return Flight"}</h3>
            <p className="text-earth-500">{flightNumber}</p>
            <p>{route}</p>
          </div>
          <Plane className="h-8 w-8 text-earth-500" />
          <div>
            <p className="font-semibold">{date}</p>
            <p>Departure: {departure}</p>
            <p>Arrival: {arrival}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlightCard;