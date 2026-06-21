import { getAirport } from "./airports.js";

export interface TimingAdvice {
  route_type: "domestic" | "international";
  booking_window: {
    min_weeks: number;
    max_weeks: number;
    sweet_spot: string;
  };
  lower_demand_days: string[];
  lower_demand_months: string[];
  data_source: string;
  note: string;
}

export function getTravelTimingAdvice(international: boolean): TimingAdvice {
  const note =
    "General travel planning guidance based on broad public market patterns. " +
    "Actual results vary by carrier, route, season, and provider integrations.";

  if (international) {
    return {
      route_type: "international",
      booking_window: { min_weeks: 8, max_weeks: 24, sweet_spot: "10 to 16 weeks before departure" },
      lower_demand_days: ["Tuesday", "Wednesday"],
      lower_demand_months: ["January", "February", "September", "October"],
      data_source: "General public travel planning patterns",
      note,
    };
  }

  return {
    route_type: "domestic",
    booking_window: { min_weeks: 3, max_weeks: 10, sweet_spot: "4 to 8 weeks before departure" },
    lower_demand_days: ["Tuesday", "Wednesday", "Saturday"],
    lower_demand_months: ["January", "February", "September"],
    data_source: "General public travel planning patterns",
    note,
  };
}

export function isInternationalRoute(origin: string, destination: string): boolean {
  const o = getAirport(origin);
  const d = getAirport(destination);
  return !(o && d && o.country === "US" && d.country === "US");
}
