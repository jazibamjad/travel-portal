using Api.Entities;

namespace Api.Dtos;

public record MaterialDto(Guid Id, string Description, Guid? OwnerPersonId, string? OwnerPersonName);
public record UpsertMaterialRequest(string Description, Guid? OwnerPersonId);

public record MeetingDto(
    Guid Id, Guid ContactId, string ContactName, int OrderNum, MeetingPriority Priority,
    MeetingStatus Status, TimeOnly? MeetingTime, string? Project, string? Entity, string Agenda,
    List<Guid> AttendeeIds, List<string> AttendeeNames, List<MaterialDto> Materials);

public record CreateMeetingRequest(
    Guid ContactId, int OrderNum, MeetingPriority Priority, MeetingStatus Status,
    TimeOnly? MeetingTime, string? Project, string? Entity, string Agenda, List<Guid>? AttendeeIds);

public record UpdateMeetingRequest(
    int? OrderNum, MeetingPriority? Priority, MeetingStatus? Status, TimeOnly? MeetingTime,
    string? Project, string? Entity, string? Agenda, List<Guid>? AttendeeIds);

public record TripDto(
    Guid Id, string Project, string Entity, Guid DestinationCityId, string DestinationLabel,
    DateOnly? FromDate, DateOnly? ToDate, TripStatus Status, string Hotel, string Transport,
    List<Guid> TravellerIds, List<string> TravellerNames, List<MeetingDto> Meetings);

public record CreateTripRequest(
    string Project, string Entity, string DestinationLabel, DateOnly? FromDate, DateOnly? ToDate,
    TripStatus Status, string? Hotel, string? Transport, List<Guid>? TravellerIds);

public record UpdateTripRequest(
    string? Project, string? Entity, string? DestinationLabel, DateOnly? FromDate, DateOnly? ToDate,
    TripStatus? Status, string? Hotel, string? Transport);

public record SetTravellersRequest(List<Guid> PersonIds);

public record BulkTripRow(string Project, string Entity, string DestinationLabel, DateOnly? FromDate, DateOnly? ToDate, TripStatus Status);
public record BulkTripRequest(List<BulkTripRow> Rows);
