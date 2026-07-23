namespace Api.Entities;

public class TeamPlanEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PersonId { get; set; }
    public Person? Person { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public Guid? CityId { get; set; }
    public City? City { get; set; }
    public PlanEntryType Type { get; set; } = PlanEntryType.Option;
    public string Notes { get; set; } = "";

    /// <summary>Only meaningful when Type == Vacation.</summary>
    public ApprovalStatus? ApprovalStatus { get; set; }
    public Guid? DecidedBy { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
}
