namespace Api.Entities;

public class Trip
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Project { get; set; } = "";
    public string Entity { get; set; } = "";
    public Guid DestinationCityId { get; set; }
    public City? DestinationCity { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public TripStatus Status { get; set; } = TripStatus.Option;
    public string Hotel { get; set; } = "";
    public string Transport { get; set; } = "";
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Person> Travellers { get; set; } = new List<Person>();
    public ICollection<Meeting> Meetings { get; set; } = new List<Meeting>();
    public ICollection<Flight> Flights { get; set; } = new List<Flight>();
}
