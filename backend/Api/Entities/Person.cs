namespace Api.Entities;

public class Person
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = "";
    public string Title { get; set; } = "";
    public string Function { get; set; } = "";
    public bool IsCeo { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TeamPlanEntry> TeamPlanEntries { get; set; } = new List<TeamPlanEntry>();
    public ICollection<Trip> TripsAccompanying { get; set; } = new List<Trip>();
}
