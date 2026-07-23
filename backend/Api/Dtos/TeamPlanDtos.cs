using Api.Entities;

namespace Api.Dtos;

public record TeamPlanEntryDto(
    Guid Id, Guid PersonId, string PersonName, DateOnly? FromDate, DateOnly? ToDate,
    Guid? CityId, string? CityLabel, PlanEntryType Type, string Notes,
    ApprovalStatus? ApprovalStatus, DateTimeOffset? DecidedAt);

public record CreateTeamPlanEntryRequest(
    Guid PersonId, DateOnly? FromDate, DateOnly? ToDate, string? CityLabel, PlanEntryType Type, string? Notes);

public record UpdateTeamPlanEntryRequest(
    DateOnly? FromDate, DateOnly? ToDate, string? CityLabel, PlanEntryType? Type, string? Notes);

public record BulkTeamPlanRequest(
    List<Guid> PersonIds, DateOnly? FromDate, DateOnly? ToDate, string? CityLabel, PlanEntryType Type, string? Notes);

public record DecisionRequest(ApprovalStatus Decision);
