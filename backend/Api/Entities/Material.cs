namespace Api.Entities;

public class Material
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MeetingId { get; set; }
    public Meeting? Meeting { get; set; }
    public string Description { get; set; } = "";
    public Guid? OwnerPersonId { get; set; }
    public Person? OwnerPerson { get; set; }
}
