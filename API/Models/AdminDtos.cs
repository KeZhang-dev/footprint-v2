namespace Footprint.Models;

public record AdminUserResponse(
    string Id,
    string Email,
    string DisplayName,
    string Role,
    DateTime CreatedAt
);
