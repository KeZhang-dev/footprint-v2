using Footprint.Models;

namespace Footprint.Tests;

public class BadgesTests
{
    [Theory]
    [InlineData(0, null)]
    [InlineData(1, null)]
    [InlineData(2, null)]
    [InlineData(3, "Bronze")]
    [InlineData(4, "Bronze")]
    [InlineData(5, "Silver")]
    [InlineData(6, "Silver")]
    [InlineData(7, "Gold")]
    [InlineData(100, "Gold")]
    public void ForPoints_ReturnsExpectedBadge(int points, string? expectedBadge)
    {
        var badge = Badges.ForPoints(points);

        Assert.Equal(expectedBadge, badge);
    }
}
