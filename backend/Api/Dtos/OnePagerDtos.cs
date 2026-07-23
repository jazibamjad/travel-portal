namespace Api.Dtos;

public record ItineraryRow(DateOnly? FromDate, DateOnly? ToDate, int Days, string CityLabel, string Type, string Notes);

public record DaysByCityRow(string CityLabel, int Days);

public record OnePagerMeetingRow(int OrderNum, TimeOnly? MeetingTime, string ContactName, string? Project, string? Entity, string Status, string Priority, string Agenda, List<string> AttendeeNames);

public record OnePagerMaterialRow(string Description, string ForMeeting, string? Owner);

public record OnePagerTripSection(
    Guid TripId, string DestinationLabel, string? Project, string? Entity, DateOnly? FromDate, DateOnly? ToDate,
    int Days, string Status, string Hotel, string Transport, List<string> TravellerNames,
    List<OnePagerMeetingRow> Meetings, List<OnePagerMaterialRow> Materials);

public record OnePagerResponse(
    Guid PersonId, string PersonName, string Title, string Function,
    List<ItineraryRow> Itinerary, List<DaysByCityRow> DaysByCity, int TotalDays,
    List<OnePagerTripSection> Trips);
