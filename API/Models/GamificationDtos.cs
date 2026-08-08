namespace Footprint.Models;

public record LeaderboardEntry(
    string UserId,
    string DisplayName,
    string? AvatarUrl,
    int Points,
    string? Badge,
    int Rank
);

public static class Badges
{
    public static string? ForPoints(int points) => points switch
    {
        >= 7 => "Gold",
        >= 5 => "Silver",
        >= 3 => "Bronze",
        _ => null,
    };
}
