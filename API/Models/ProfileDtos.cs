using System.ComponentModel.DataAnnotations;

namespace Footprint.Models;

public record ProfileResponse(string Email, string DisplayName, string? Bio, string? Interests, string? AvatarUrl);

public record UpdateProfileRequest(
    [Required][MaxLength(100)] string DisplayName,
    [MaxLength(200)] string? Bio,
    [MaxLength(300)] string? Interests
);
