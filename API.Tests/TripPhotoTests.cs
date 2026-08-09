using Footprint.Models;

namespace Footprint.Tests;

public class TripPhotoTests
{
    [Theory]
    [InlineData("abc123.jpg", "/uploads/abc123.jpg")]
    [InlineData("photo with spaces.png", "/uploads/photo with spaces.png")]
    public void Url_PrefixesFileNameWithUploadsPath(string fileName, string expectedUrl)
    {
        var photo = new TripPhoto { FileName = fileName };

        Assert.Equal(expectedUrl, photo.Url);
    }
}
