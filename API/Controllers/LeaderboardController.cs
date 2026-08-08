using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Footprint.Data;
using Footprint.Models;

namespace Footprint.Controllers;

[ApiController]
[Route("api/leaderboard")]
[Authorize]
public class LeaderboardController : ControllerBase
{
    private readonly FootprintDbContext _db;

    public LeaderboardController(FootprintDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<LeaderboardEntry>>> GetLeaderboard()
    {
        var ranked = await _db.Users
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                u.AvatarFileName,
                Points = _db.Trips.Count(t => t.UserId == u.Id && t.IsPublic),
            })
            .Where(u => u.Points > 0)
            .OrderByDescending(u => u.Points)
            .ThenBy(u => u.DisplayName)
            .Take(10)
            .ToListAsync();

        var entries = ranked.Select((u, index) => new LeaderboardEntry(
            u.Id,
            u.DisplayName,
            u.AvatarFileName == null ? null : "/uploads/" + u.AvatarFileName,
            u.Points,
            Badges.ForPoints(u.Points),
            index + 1));

        return Ok(entries);
    }
}
