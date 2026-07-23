namespace Api.Entities;

public class Meeting
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Trip? Trip { get; set; }
    public Guid ContactId { get; set; }
    public Contact? Contact { get; set; }
    public int OrderNum { get; set; } = 1;
    public MeetingPriority Priority { get; set; } = MeetingPriority.Medium;
    public MeetingStatus Status { get; set; } = MeetingStatus.Proposed;
    public TimeOnly? MeetingTime { get; set; }
    public string? Project { get; set; }
    public string? Entity { get; set; }
    public string Agenda { get; set; } = "";

    public ICollection<Person> Attendees { get; set; } = new List<Person>();
    public ICollection<Material> Materials { get; set; } = new List<Material>();
}
