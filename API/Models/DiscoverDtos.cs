using System.ComponentModel.DataAnnotations;

namespace Footprint.Models;

public record DiscoverTripSummary(
    int Id,
    string Title,
    string Destination,
    DateTime StartDate,
    DateTime EndDate,
    string? CoverPhotoUrl,
    List<string> PhotoUrls,
    string AuthorDisplayName,
    string? AuthorAvatarUrl,
    int LikeCount,
    bool LikedByMe
);

public record DiscoverFeedResponse(List<DiscoverTripSummary> Items, string? NextCursor);

public record DiscoverTripDetail(
    int Id,
    string Title,
    string Destination,
    string? Notes,
    DateTime StartDate,
    DateTime EndDate,
    string AuthorDisplayName,
    string? AuthorAvatarUrl,
    List<string> PhotoUrls,
    int LikeCount,
    bool LikedByMe,
    bool FavoritedByMe
);

public record CommentResponse(
    int Id,
    string Text,
    DateTime CreatedAt,
    string AuthorDisplayName,
    string? AuthorAvatarUrl
);

public record CreateCommentRequest([Required][MaxLength(500)] string Text);

public record LikeToggleResponse(bool Liked, int LikeCount);

public record FavoriteToggleResponse(bool Favorited);
