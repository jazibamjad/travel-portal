namespace Api.Entities;

public class Flight
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TravellerPersonId { get; set; }
    public Person? TravellerPerson { get; set; }
    public Guid? TripId { get; set; }
    public Trip? Trip { get; set; }
    public string OriginLabel { get; set; } = "";
    public string DestinationLabel { get; set; } = "";
    public string FlightDateText { get; set; } = "";
    public string FlightNo { get; set; } = "";
    public string DepartText { get; set; } = "";
    public string ArriveText { get; set; } = "";
    public string Aircraft { get; set; } = "";
}
