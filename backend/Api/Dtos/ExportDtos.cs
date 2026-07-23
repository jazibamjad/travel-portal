using Api.Entities;

namespace Api.Dtos;

public record ExportPerson(string FullName, string Title, string Function, bool IsCeo);
public record ExportContact(string Name, string OrgRole, string? Email);
public record ExportCity(string Label, List<ExportContact> Contacts);
public record ExportMaterial(string Description, string? OwnerName);
public record ExportMeeting(
    string ContactName, string ContactCityLabel, int OrderNum, MeetingPriority Priority, MeetingStatus Status,
    TimeOnly? MeetingTime, string? Project, string? Entity, string Agenda, List<string> AttendeeNames, List<ExportMaterial> Materials);
public record ExportTrip(
    string Project, string Entity, string DestinationLabel, DateOnly? FromDate, DateOnly? ToDate, TripStatus Status,
    string Hotel, string Transport, List<string> TravellerNames, List<ExportMeeting> Meetings);
public record ExportFlight(
    string TravellerName, string OriginLabel, string DestinationLabel, string FlightDateText,
    string FlightNo, string DepartText, string ArriveText, string Aircraft);
public record ExportTeamPlan(
    string PersonName, DateOnly? FromDate, DateOnly? ToDate, string? CityLabel, PlanEntryType Type,
    string Notes, ApprovalStatus? ApprovalStatus);

public record ExportBundle(
    DateTimeOffset ExportedAt, List<ExportPerson> People, List<ExportCity> Cities,
    List<ExportTrip> Trips, List<ExportFlight> Flights, List<ExportTeamPlan> TeamPlan);
