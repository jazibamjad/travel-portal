namespace Api.Entities;

public class Contact
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CityId { get; set; }
    public City? City { get; set; }
    public string Name { get; set; } = "";
    public string OrgRole { get; set; } = "";
    public string? Email { get; set; }

    public ICollection<Meeting> Meetings { get; set; } = new List<Meeting>();
}
