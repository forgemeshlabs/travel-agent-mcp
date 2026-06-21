export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export const AIRPORTS: Record<string, Airport> = {
  JFK: { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "US", timezone: "America/New_York" },
  LGA: { code: "LGA", name: "LaGuardia Airport", city: "New York", country: "US", timezone: "America/New_York" },
  EWR: { code: "EWR", name: "Newark Liberty International Airport", city: "Newark", country: "US", timezone: "America/New_York" },
  LAX: { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "US", timezone: "America/Los_Angeles" },
  SFO: { code: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "US", timezone: "America/Los_Angeles" },
  ORD: { code: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "US", timezone: "America/Chicago" },
  ATL: { code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", country: "US", timezone: "America/New_York" },
  DFW: { code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", country: "US", timezone: "America/Chicago" },
  IAH: { code: "IAH", name: "George Bush Intercontinental Airport", city: "Houston", country: "US", timezone: "America/Chicago" },
  HOU: { code: "HOU", name: "William P. Hobby Airport", city: "Houston", country: "US", timezone: "America/Chicago" },
  MIA: { code: "MIA", name: "Miami International Airport", city: "Miami", country: "US", timezone: "America/New_York" },
  LAS: { code: "LAS", name: "Harry Reid International Airport", city: "Las Vegas", country: "US", timezone: "America/Los_Angeles" },
  SEA: { code: "SEA", name: "Seattle-Tacoma International Airport", city: "Seattle", country: "US", timezone: "America/Los_Angeles" },
  BOS: { code: "BOS", name: "Boston Logan International Airport", city: "Boston", country: "US", timezone: "America/New_York" },
  DEN: { code: "DEN", name: "Denver International Airport", city: "Denver", country: "US", timezone: "America/Denver" },
};

export function getAirport(code: string): Airport | null {
  return AIRPORTS[code.toUpperCase()] ?? null;
}
