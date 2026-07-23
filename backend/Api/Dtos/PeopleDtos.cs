namespace Api.Dtos;

public record PersonDto(Guid Id, string FullName, string Title, string Function, bool IsCeo);

public record UpdatePersonRequest(string? Title, string? Function);
