export type UserRole = "Coordinator" | "Ceo" | "TeamMember";
export type TripStatus = "Confirmed" | "Option" | "Tentative";
export type MeetingPriority = "High" | "Medium" | "Low";
export type MeetingStatus = "Proposed" | "Requested" | "Confirmed" | "Tentative" | "Declined" | "Completed";
export type PlanEntryType = "Trip" | "Option" | "Vacation" | "Remote";
export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface MeResponse {
  userId: string;
  email: string;
  role: UserRole;
  personId?: string | null;
  personName?: string | null;
}

export interface PersonDto {
  id: string;
  fullName: string;
  title: string;
  function: string;
  isCeo: boolean;
}

export interface CityDto {
  id: string;
  cityName: string;
  country: string;
  label: string;
  contactCount: number;
}

export interface ContactDto {
  id: string;
  cityId: string;
  name: string;
  orgRole: string;
  email?: string | null;
}

export interface MaterialDto {
  id: string;
  description: string;
  ownerPersonId?: string | null;
  ownerPersonName?: string | null;
}

export interface MeetingDto {
  id: string;
  contactId: string;
  contactName: string;
  orderNum: number;
  priority: MeetingPriority;
  status: MeetingStatus;
  meetingTime?: string | null;
  project?: string | null;
  entity?: string | null;
  agenda: string;
  attendeeIds: string[];
  attendeeNames: string[];
  materials: MaterialDto[];
}

export interface TripDto {
  id: string;
  project: string;
  entity: string;
  destinationCityId: string;
  destinationLabel: string;
  fromDate?: string | null;
  toDate?: string | null;
  status: TripStatus;
  hotel: string;
  transport: string;
  travellerIds: string[];
  travellerNames: string[];
  meetings: MeetingDto[];
}

export interface FlightDto {
  id: string;
  travellerPersonId: string;
  travellerName: string;
  tripId?: string | null;
  originLabel: string;
  destinationLabel: string;
  flightDateText: string;
  flightNo: string;
  departText: string;
  arriveText: string;
  aircraft: string;
}

export interface TeamPlanEntryDto {
  id: string;
  personId: string;
  personName: string;
  fromDate?: string | null;
  toDate?: string | null;
  cityId?: string | null;
  cityLabel?: string | null;
  type: PlanEntryType;
  notes: string;
  approvalStatus?: ApprovalStatus | null;
  decidedAt?: string | null;
}

export interface KpiResponse {
  upcomingTrips: number;
  nextDepartureCity?: string | null;
  nextDepartureDate?: string | null;
  totalTravelDays: number;
  meetingsPlanned: number;
}

export interface CalendarEntryDto {
  personId: string;
  personName: string;
  title: string;
  function: string;
  fromDate?: string | null;
  toDate?: string | null;
  cityLabel?: string | null;
  type: string;
  approvalStatus?: string | null;
  tripId?: string | null;
}

export interface ItineraryRow {
  fromDate?: string | null;
  toDate?: string | null;
  days: number;
  cityLabel: string;
  type: string;
  notes: string;
}

export interface DaysByCityRow {
  cityLabel: string;
  days: number;
}

export interface OnePagerMeetingRow {
  orderNum: number;
  meetingTime?: string | null;
  contactName: string;
  project?: string | null;
  entity?: string | null;
  status: string;
  priority: string;
  agenda: string;
  attendeeNames: string[];
}

export interface OnePagerMaterialRow {
  description: string;
  forMeeting: string;
  owner?: string | null;
}

export interface OnePagerTripSection {
  tripId: string;
  destinationLabel: string;
  project?: string | null;
  entity?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  days: number;
  status: string;
  hotel: string;
  transport: string;
  travellerNames: string[];
  meetings: OnePagerMeetingRow[];
  materials: OnePagerMaterialRow[];
}

export interface OnePagerResponse {
  personId: string;
  personName: string;
  title: string;
  function: string;
  itinerary: ItineraryRow[];
  daysByCity: DaysByCityRow[];
  totalDays: number;
  trips: OnePagerTripSection[];
}
