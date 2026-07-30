using System.ComponentModel.DataAnnotations;

namespace Footprint.Models;

public record RegisterRequest(
    [Required] string Email,
    [Required][MinLength(8)] string Password
);

public record LoginRequest(
    [Required] string Email,
    [Required] string Password
);

public record AuthResponse(string Token, string UserId, string Email, string Role, DateTime ExpiresAt);
