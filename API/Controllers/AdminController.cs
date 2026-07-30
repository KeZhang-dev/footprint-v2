using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Footprint.Data;
using Footprint.Models;
using Footprint.Services;

namespace Footprint.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly FootprintDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPhotoStorageService _photoStorage;

    public AdminController(FootprintDbContext db, UserManager<ApplicationUser> userManager, IPhotoStorageService photoStorage)
    {
        _db = db;
        _userManager = userManager;
        _photoStorage = photoStorage;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Authenticated request is missing a user id claim.");

    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<AdminUserResponse>>> GetUsers()
    {
        var users = await _db.Users
            .OrderBy(u => u.CreatedAt)
            .Select(u => new { u.Id, u.Email, u.DisplayName, u.CreatedAt })
            .ToListAsync();

        // Grouped, not a straight ToDictionary: nothing stops a user from
        // holding more than one role (this endpoint's own tests hit that
        // case), so pick deterministically rather than crashing on a
        // duplicate key. "Admin" wins if present.
        var rolesByUserId = (await (
            from userRole in _db.UserRoles
            join role in _db.Roles on userRole.RoleId equals role.Id
            select new { userRole.UserId, RoleName = role.Name }
        ).ToListAsync())
            .GroupBy(x => x.UserId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.RoleName).FirstOrDefault(r => r == "Admin") ?? g.First().RoleName ?? "User");

        var response = users.Select(u => new AdminUserResponse(
            u.Id,
            u.Email!,
            u.DisplayName,
            rolesByUserId.GetValueOrDefault(u.Id, "User"),
            u.CreatedAt));

        return Ok(response);
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var target = await _userManager.FindByIdAsync(id);
        if (target is null)
        {
            return NotFound();
        }

        if (id == CurrentUserId)
        {
            return BadRequest(new { error = "You cannot delete your own account." });
        }

        if (await _userManager.IsInRoleAsync(target, "Admin"))
        {
            return BadRequest(new { error = "Cannot delete another Admin account." });
        }

        // Trip photo files (and the target's avatar) live on disk, outside the
        // database's cascade-delete reach — collect their names before the
        // DB-level cascade removes the rows that reference them, so they can
        // still be found and deleted from wwwroot/uploads afterward.
        var tripPhotoFileNames = await _db.TripPhotos
            .Where(p => p.Trip!.UserId == id)
            .Select(p => p.FileName)
            .ToListAsync();

        var fileNamesToDelete = target.AvatarFileName is null
            ? tripPhotoFileNames
            : tripPhotoFileNames.Append(target.AvatarFileName).ToList();

        var result = await _userManager.DeleteAsync(target);
        if (!result.Succeeded)
        {
            return Problem(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        foreach (var fileName in fileNamesToDelete)
        {
            _photoStorage.Delete(fileName);
        }

        return NoContent();
    }
}
