using System.ComponentModel.DataAnnotations;

namespace Footprint.Models;

public record TripRequest(
    [Required] string Title,
    [Required] string Destination,
    DateTime StartDate,
    DateTime EndDate,
    string? Notes,
    bool IsPublic
);
