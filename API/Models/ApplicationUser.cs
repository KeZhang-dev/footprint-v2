using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace Footprint.Models;

public class ApplicationUser : IdentityUser
{
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Bio { get; set; }

    [MaxLength(300)]
    public string? Interests { get; set; }

    public string? AvatarFileName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
