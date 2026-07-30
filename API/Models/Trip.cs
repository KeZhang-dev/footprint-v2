using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Footprint.Models;

public class Trip
{
    public int Id { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Destination { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsPublic { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    public ApplicationUser? User { get; set; }

    public List<TripPhoto> Photos { get; set; } = [];

    [JsonIgnore]
    public List<Like> Likes { get; set; } = [];

    [JsonIgnore]
    public List<Favorite> Favorites { get; set; } = [];

    [JsonIgnore]
    public List<Comment> Comments { get; set; } = [];
}
