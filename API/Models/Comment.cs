using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Footprint.Models;

public class Comment
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public int TripId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Text { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public ApplicationUser? User { get; set; }

    [JsonIgnore]
    public Trip? Trip { get; set; }
}
