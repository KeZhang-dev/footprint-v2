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

        return Ok(ToResponse(user));
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

        return Ok(ToResponse(user));
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

        return Ok(ToResponse(user));
    }

    private static ProfileResponse ToResponse(ApplicationUser user) => new(
        user.Email!,
        user.DisplayName,
        user.Bio,
        user.Interests,
        user.AvatarFileName is null ? null : $"/uploads/{user.AvatarFileName}"
    );

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
    public async Task<IActionResult> GetLikedTrips()
    {
        var user = await _userManager.GetUserAsync(User); //_userManage可以直接获取当前用户的信息
        if (user == null) return NotFound();

        var likedTrips = await _context.Likes
            .Where(l => l.UserId == user.Id)
            .Include(l => l.Trip)
            .Select(l => l.Trip)
            .ToListAsync();
        return Ok(likedTrips);
    }

    [HttpGet("saved-trips")]
    public async Task<IActionResult> GetSavedTrips()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        var savedTrips = await _context.Favorites
            .Where(s => s.UserId == user.Id)
            .Include(s => s.Trip)
            .Select(s => s.Trip)
            .ToListAsync();
        return Ok(savedTrips);
    }
}
