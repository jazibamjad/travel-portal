namespace Api.Dtos;

public record CityDto(Guid Id, string CityName, string Country, string Label, int ContactCount);

public record CreateCityRequest(string Label);

public record ContactDto(Guid Id, Guid CityId, string Name, string OrgRole, string? Email);

public record CreateContactRequest(string Name, string OrgRole, string? Email);
