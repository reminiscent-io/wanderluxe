import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Trip } from "@db/schema";

interface TripCardProps {
  trip: Trip;
  onClick?: () => void;
}

export function TripCard({ trip, onClick }: TripCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold">{trip.title}</CardTitle>
          <Badge>{trip.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{trip.destination}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dates</span>
            <span>
              {trip.startDate &&
                `${format(new Date(trip.startDate), "MMM d")} - ${format(
                  new Date(trip.endDate!),
                  "MMM d, yyyy"
                )}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span>
              {trip.budget
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(trip.budget)
                : "Not set"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
