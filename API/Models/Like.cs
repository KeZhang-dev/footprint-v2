using System.Text.Json.Serialization;

namespace Footprint.Models;

public class Like
{
    public string UserId { get; set; } = string.Empty;

    public int TripId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public ApplicationUser? User { get; set; }

    [JsonIgnore]
    public Trip? Trip { get; set; }
}
