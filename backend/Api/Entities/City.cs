namespace Api.Entities;

public class City
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string CityName { get; set; } = "";
    public string Country { get; set; } = "";
    /// <summary>Display label, e.g. "Prague, Czechia" — unique, matches the prototype's combined city/country strings.</summary>
    public string Label { get; set; } = "";

    public ICollection<Contact> Contacts { get; set; } = new List<Contact>();
}
