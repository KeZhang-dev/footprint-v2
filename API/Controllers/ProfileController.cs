using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Footprint.Models;
using Footprint.Services;
using Microsoft.EntityFrameworkCore;
using Footprint.Data;

namespace Footprint.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPhotoStorageService _photoStorage;
    private readonly FootprintDbContext _context;

    public ProfileController(UserManager<ApplicationUser> userManager, IPhotoStorageService photoStorage, FootprintDbContext context)
    {
        _userManager = userManager;
        _photoStorage = photoStorage;
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ProfileResponse>> GetProfile()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(await ToResponse(user));
    }

    [HttpPut]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return NotFound();
        }

        user.DisplayName = request.DisplayName;
        user.Bio = request.Bio;
        user.Interests = request.Interests;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return ValidationProblem(BuildModelState(result));
        }

        return Ok(await ToResponse(user));
    }

    [HttpPost("avatar")]
    public async Task<ActionResult<ProfileResponse>> UploadAvatar(IFormFile file)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return NotFound();
        }

        if (!_photoStorage.IsValidPhoto(file, out var error))
        {
            return BadRequest(new { error });
        }

        var fileName = await _photoStorage.SaveAsync(file);
        var previousFileName = user.AvatarFileName;

        user.AvatarFileName = fileName;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            _photoStorage.Delete(fileName);
            return ValidationProblem(BuildModelState(result));
        }

        if (previousFileName is not null)
        {
            _photoStorage.Delete(previousFileName);
        }

        return Ok(await ToResponse(user));
    }

    private async Task<ProfileResponse> ToResponse(ApplicationUser user)
    {
        var points = await _context.Trips.CountAsync(t => t.UserId == user.Id && t.IsPublic);

        return new(
            user.Email!,
            user.DisplayName,
            user.Bio,
            user.Interests,
            user.AvatarFileName is null ? null : $"/uploads/{user.AvatarFileName}",
            points,
            Badges.ForPoints(points)
        );
    }

    private static ModelStateDictionary BuildModelState(IdentityResult result)
    {
        var modelState = new ModelStateDictionary();
        foreach (var error in result.Errors)
        {
            modelState.AddModelError(error.Code, error.Description);
        }
        return modelState;
    }

    [HttpGet("liked-trips")]
    public async Task<ActionResult<List<DiscoverTripSummary>>> GetLikedTrips()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        var trips = await _context.Likes
            .Where(l => l.UserId == user.Id)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new DiscoverTripSummary(
                l.Trip!.Id,
                l.Trip.Title,
                l.Trip.Destination,
                l.Trip.StartDate,
                l.Trip.EndDate,
                l.Trip.Photos.OrderBy(p => p.UploadedAt).Select(p => "/uploads/" + p.FileName).FirstOrDefault(),
                l.Trip.Photos.OrderBy(p => p.UploadedAt).Select(p => "/uploads/" + p.FileName).ToList(),
                l.Trip.User!.DisplayName,
                l.Trip.User.AvatarFileName == null ? null : "/uploads/" + l.Trip.User.AvatarFileName,
                l.Trip.Likes.Count,
                true))
            .ToListAsync();

        return Ok(trips);
    }

    [HttpGet("saved-trips")]
    public async Task<ActionResult<List<DiscoverTripSummary>>> GetSavedTrips()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        var trips = await _context.Favorites
            .Where(f => f.UserId == user.Id)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new DiscoverTripSummary(
                f.Trip!.Id,
                f.Trip.Title,
                f.Trip.Destination,
                f.Trip.StartDate,
                f.Trip.EndDate,
                f.Trip.Photos.OrderBy(p => p.UploadedAt).Select(p => "/uploads/" + p.FileName).FirstOrDefault(),
                f.Trip.Photos.OrderBy(p => p.UploadedAt).Select(p => "/uploads/" + p.FileName).ToList(),
                f.Trip.User!.DisplayName,
                f.Trip.User.AvatarFileName == null ? null : "/uploads/" + f.Trip.User.AvatarFileName,
                f.Trip.Likes.Count,
                f.Trip.Likes.Any(l => l.UserId == user.Id)))
            .ToListAsync();

        return Ok(trips);
    }
}
