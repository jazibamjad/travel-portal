namespace Api.Dtos;

public record FlightDto(
    Guid Id, Guid TravellerPersonId, string TravellerName, Guid? TripId,
    string OriginLabel, string DestinationLabel, string FlightDateText,
    string FlightNo, string DepartText, string ArriveText, string Aircraft);

public record UpsertFlightRequest(
    Guid TravellerPersonId, string OriginLabel, string DestinationLabel, string FlightDateText,
    string FlightNo, string DepartText, string ArriveText, string Aircraft, Guid? TripId);
