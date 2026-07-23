using Api.Entities;

namespace Api.Dtos;

public record LoginRequest(string Email, string Password);

public record MeResponse(Guid UserId, string Email, UserRole Role, Guid? PersonId, string? PersonName);
