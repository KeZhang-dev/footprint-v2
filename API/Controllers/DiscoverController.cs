using System.Globalization;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Footprint.Data;
using Footprint.Models;

namespace Footprint.Controllers;

[ApiController]
[Route("api/discover")]
[Authorize]
public class DiscoverController : ControllerBase
{
    private const int DefaultLimit = 20;
    private const int MaxLimit = 50;

    private readonly FootprintDbContext _db;

    public DiscoverController(FootprintDbContext db)
    {
        _db = db;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Authenticated request is missing a user id claim.");

    [HttpGet]
    public async Task<ActionResult<DiscoverFeedResponse>> GetFeed([FromQuery] string? cursor, [FromQuery] int? limit)
    {
        var take = Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);
        var userId = CurrentUserId;

        var query = _db.Trips.Where(t => t.IsPublic);

        if (cursor is not null)
        {
            if (!TryDecodeCursor(cursor, out var cursorCreatedAt, out var cursorId))
            {
                return BadRequest(new { error = "Invalid cursor." });
            }

            query = query.Where(t =>
                t.CreatedAt < cursorCreatedAt ||
                (t.CreatedAt == cursorCreatedAt && t.Id < cursorId));
        }

        var rows = await query
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Id)
            .Take(take + 1)
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Destination,
                t.StartDate,
                t.EndDate,
                t.CreatedAt,
                CoverPhotoUrl = t.Photos.OrderBy(p => p.UploadedAt).Select(p => "/uploads/" + p.FileName).FirstOrDefault(),
                PhotoUrls = t.Photos.OrderBy(p => p.UploadedAt).Select(p => "/uploads/" + p.FileName).ToList(),
                AuthorDisplayName = t.User!.DisplayName,
                AuthorAvatarUrl = t.User.AvatarFileName == null ? null : "/uploads/" + t.User.AvatarFileName,
                LikeCount = t.Likes.Count,
                LikedByMe = t.Likes.Any(l => l.UserId == userId),
            })
            .ToListAsync();

        var hasMore = rows.Count > take;
        if (hasMore)
        {
            rows.RemoveAt(rows.Count - 1);
        }

        var items = rows.Select(r => new DiscoverTripSummary(
            r.Id, r.Title, r.Destination, r.StartDate, r.EndDate,
            r.CoverPhotoUrl, r.PhotoUrls, r.AuthorDisplayName, r.AuthorAvatarUrl,
            r.LikeCount, r.LikedByMe)).ToList();

        string? nextCursor = hasMore && rows.Count > 0
            ? EncodeCursor(rows[^1].CreatedAt, rows[^1].Id)
            : null;

        return Ok(new DiscoverFeedResponse(items, nextCursor));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DiscoverTripDetail>> GetTripDetail(int id)
    {
        var userId = CurrentUserId;

        var trip = await _db.Trips
            .Include(t => t.Photos)
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip is null || (!trip.IsPublic && trip.UserId != userId))
        {
            return NotFound();
        }

        var likeCount = await _db.Likes.CountAsync(l => l.TripId == id);
        var likedByMe = await _db.Likes.FindAsync(userId, id) is not null;
        var favoritedByMe = await _db.Favorites.FindAsync(userId, id) is not null;

        return Ok(new DiscoverTripDetail(
            trip.Id,
            trip.Title,
            trip.Destination,
            trip.Notes,
            trip.StartDate,
            trip.EndDate,
            trip.User!.DisplayName,
            trip.User.AvatarFileName == null ? null : $"/uploads/{trip.User.AvatarFileName}",
            trip.Photos.OrderBy(p => p.UploadedAt).Select(p => p.Url).ToList(),
            likeCount,
            likedByMe,
            favoritedByMe));
    }

    private static string EncodeCursor(DateTime createdAt, int id)
    {
        var raw = $"{createdAt:O}_{id}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
    }

    private static bool TryDecodeCursor(string cursor, out DateTime createdAt, out int id)
    {
        createdAt = default;
        id = default;
        try
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            var parts = raw.Split('_', 2);
            if (parts.Length != 2)
            {
                return false;
            }

            if (!DateTime.TryParse(parts[0], CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out createdAt))
            {
                return false;
            }

            return int.TryParse(parts[1], out id);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
