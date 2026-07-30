using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Footprint.Data;
using Footprint.Models;
using Footprint.Services;

namespace Footprint.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly FootprintDbContext _db;
    private readonly IPhotoStorageService _photoStorage;

    public TripsController(FootprintDbContext db, IPhotoStorageService photoStorage)
    {
        _db = db;
        _photoStorage = photoStorage;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Authenticated request is missing a user id claim.");

    /// <summary>
    /// A trip is accessible for social actions (like/favorite/comment) if it's
    /// public, or if the caller owns it — same not-found-not-forbidden
    /// convention as the rest of this controller for anything else.
    /// </summary>
    private async Task<Trip?> GetAccessibleTripAsync(int id)
    {
        var trip = await _db.Trips.FindAsync(id);
        if (trip is null || (!trip.IsPublic && trip.UserId != CurrentUserId))
        {
            return null;
        }
        return trip;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Trip>>> GetTrips()
    {
        return await _db.Trips
            .Include(t => t.Photos)
            .Where(t => t.UserId == CurrentUserId)
            .OrderByDescending(t => t.StartDate)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Trip>> GetTrip(int id)
    {
        var trip = await _db.Trips.Include(t => t.Photos).FirstOrDefaultAsync(t => t.Id == id);
        if (trip is null || trip.UserId != CurrentUserId)
        {
            return NotFound();
        }

        return trip;
    }

    [HttpPost]
    public async Task<ActionResult<Trip>> CreateTrip(TripRequest request)
    {
        var trip = new Trip
        {
            Title = request.Title,
            Destination = request.Destination,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Notes = request.Notes,
            IsPublic = request.IsPublic,
            CreatedAt = DateTime.UtcNow,
            UserId = CurrentUserId,
        };
        _db.Trips.Add(trip);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTrip), new { id = trip.Id }, trip);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTrip(int id, TripRequest request)
    {
        var existing = await _db.Trips.FindAsync(id);
        if (existing is null || existing.UserId != CurrentUserId)
        {
            return NotFound();
        }

        existing.Title = request.Title;
        existing.Destination = request.Destination;
        existing.StartDate = request.StartDate;
        existing.EndDate = request.EndDate;
        existing.Notes = request.Notes;
        existing.IsPublic = request.IsPublic;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var trip = await _db.Trips.FindAsync(id);
        if (trip is null || trip.UserId != CurrentUserId)
        {
            return NotFound();
        }

        _db.Trips.Remove(trip);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id:int}/photos")]
    public async Task<ActionResult<IEnumerable<TripPhoto>>> UploadPhotos(int id, [FromForm] List<IFormFile> files)
    {
        var trip = await _db.Trips.FindAsync(id);
        if (trip is null || trip.UserId != CurrentUserId)
        {
            return NotFound();
        }

        if (files.Count == 0)
        {
            return BadRequest(new { error = "No files provided." });
        }

        foreach (var file in files)
        {
            if (!_photoStorage.IsValidPhoto(file, out var error))
            {
                return BadRequest(new { error });
            }
        }

        var photos = new List<TripPhoto>();
        foreach (var file in files)
        {
            var fileName = await _photoStorage.SaveAsync(file);
            photos.Add(new TripPhoto
            {
                TripId = trip.Id,
                FileName = fileName,
                UploadedAt = DateTime.UtcNow,
            });
        }

        _db.TripPhotos.AddRange(photos);
        await _db.SaveChangesAsync();

        return Ok(photos);
    }

    [HttpDelete("{id:int}/photos/{photoId:int}")]
    public async Task<IActionResult> DeletePhoto(int id, int photoId)
    {
        var trip = await _db.Trips.FindAsync(id);
        if (trip is null || trip.UserId != CurrentUserId)
        {
            return NotFound();
        }

        var photo = await _db.TripPhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.TripId == id);
        if (photo is null)
        {
            return NotFound();
        }

        _photoStorage.Delete(photo.FileName);
        _db.TripPhotos.Remove(photo);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id:int}/like")]
    public async Task<ActionResult<LikeToggleResponse>> LikeTrip(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null)
        {
            return NotFound();
        }

        if (await _db.Likes.FindAsync(CurrentUserId, id) is null)
        {
            _db.Likes.Add(new Like { UserId = CurrentUserId, TripId = id });
            await _db.SaveChangesAsync();
        }

        var likeCount = await _db.Likes.CountAsync(l => l.TripId == id);
        return Ok(new LikeToggleResponse(true, likeCount));
    }

    [HttpDelete("{id:int}/like")]
    public async Task<ActionResult<LikeToggleResponse>> UnlikeTrip(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null)
        {
            return NotFound();
        }

        var existing = await _db.Likes.FindAsync(CurrentUserId, id);
        if (existing is not null)
        {
            _db.Likes.Remove(existing);
            await _db.SaveChangesAsync();
        }

        var likeCount = await _db.Likes.CountAsync(l => l.TripId == id);
        return Ok(new LikeToggleResponse(false, likeCount));
    }

    [HttpPost("{id:int}/favorite")]
    public async Task<ActionResult<FavoriteToggleResponse>> FavoriteTrip(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null)
        {
            return NotFound();
        }

        if (await _db.Favorites.FindAsync(CurrentUserId, id) is null)
        {
            _db.Favorites.Add(new Favorite { UserId = CurrentUserId, TripId = id });
            await _db.SaveChangesAsync();
        }

        return Ok(new FavoriteToggleResponse(true));
    }

    [HttpDelete("{id:int}/favorite")]
    public async Task<ActionResult<FavoriteToggleResponse>> UnfavoriteTrip(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null)
        {
            return NotFound();
        }

        var existing = await _db.Favorites.FindAsync(CurrentUserId, id);
        if (existing is not null)
        {
            _db.Favorites.Remove(existing);
            await _db.SaveChangesAsync();
        }

        return Ok(new FavoriteToggleResponse(false));
    }

    [HttpGet("{id:int}/comments")]
    public async Task<ActionResult<IEnumerable<CommentResponse>>> GetComments(int id)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null)
        {
            return NotFound();
        }

        var comments = await _db.Comments
            .Where(c => c.TripId == id)
            .OrderBy(c => c.CreatedAt)
            .Join(_db.Users, c => c.UserId, u => u.Id, (c, u) => new CommentResponse(
                c.Id,
                c.Text,
                c.CreatedAt,
                u.DisplayName,
                u.AvatarFileName == null ? null : "/uploads/" + u.AvatarFileName))
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("{id:int}/comments")]
    public async Task<ActionResult<CommentResponse>> CreateComment(int id, CreateCommentRequest request)
    {
        var trip = await GetAccessibleTripAsync(id);
        if (trip is null)
        {
            return NotFound();
        }

        var comment = new Comment
        {
            TripId = id,
            UserId = CurrentUserId,
            Text = request.Text,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        var author = await _db.Users.FindAsync(CurrentUserId);
        return Ok(new CommentResponse(
            comment.Id,
            comment.Text,
            comment.CreatedAt,
            author!.DisplayName,
            author.AvatarFileName == null ? null : $"/uploads/{author.AvatarFileName}"));
    }
}
