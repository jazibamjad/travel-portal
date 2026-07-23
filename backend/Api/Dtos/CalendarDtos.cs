namespace Api.Dtos;

public record KpiResponse(int UpcomingTrips, string? NextDepartureCity, DateOnly? NextDepartureDate, int TotalTravelDays, int MeetingsPlanned);

public record CalendarEntryDto(Guid PersonId, string PersonName, string Title, string Function, DateOnly? FromDate, DateOnly? ToDate, string? CityLabel, string Type, string? ApprovalStatus, Guid? TripId);

public record CalendarResponse(List<CalendarEntryDto> Entries);
