using System.Text;
using Footprint.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Net.Http.Headers;

namespace Footprint.Tests;

// IsValidPhoto is pure validation logic (size/extension/content-type), no
// database involved - the constructor needs IWebHostEnvironment/
// IConfiguration only to resolve where uploads *would* go on disk.
public class PhotoStorageServiceTests
{
    private static PhotoStorageService CreateService()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), "footprint-tests-" + Guid.NewGuid());
        var env = new FakeWebHostEnvironment { ContentRootPath = tempRoot };
        var configuration = new ConfigurationBuilder().Build();
        return new PhotoStorageService(env, configuration);
    }

    private static IFormFile CreateFormFile(string fileName, string contentType, int sizeBytes)
    {
        var stream = new MemoryStream(new byte[sizeBytes]);
        var formFile = new FormFile(stream, 0, stream.Length, "files", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType,
        };
        return formFile;
    }

    [Fact]
    public void IsValidPhoto_AcceptsValidJpeg()
    {
        var service = CreateService();
        var file = CreateFormFile("photo.jpg", "image/jpeg", 1024);

        var isValid = service.IsValidPhoto(file, out var error);

        Assert.True(isValid);
        Assert.Null(error);
    }

    [Fact]
    public void IsValidPhoto_RejectsEmptyFile()
    {
        var service = CreateService();
        var file = CreateFormFile("photo.jpg", "image/jpeg", 0);

        var isValid = service.IsValidPhoto(file, out var error);

        Assert.False(isValid);
        Assert.Contains("empty", error);
    }

    [Fact]
    public void IsValidPhoto_RejectsFileOverSizeLimit()
    {
        var service = CreateService();
        var file = CreateFormFile("photo.jpg", "image/jpeg", 3 * 1024 * 1024);

        var isValid = service.IsValidPhoto(file, out var error);

        Assert.False(isValid);
        Assert.Contains("2MB", error);
    }

    [Theory]
    [InlineData("photo.gif", "image/gif")]
    [InlineData("photo.txt", "text/plain")]
    public void IsValidPhoto_RejectsDisallowedExtensions(string fileName, string contentType)
    {
        var service = CreateService();
        var file = CreateFormFile(fileName, contentType, 1024);

        var isValid = service.IsValidPhoto(file, out var error);

        Assert.False(isValid);
        Assert.Contains("JPG or PNG", error);
    }

    [Fact]
    public void IsValidPhoto_RejectsExtensionContentTypeMismatch()
    {
        var service = CreateService();
        // .jpg extension but a PNG content-type - IsValidPhoto checks both agree.
        var file = CreateFormFile("photo.jpg", "image/png", 1024);

        var isValid = service.IsValidPhoto(file, out var error);

        Assert.False(isValid);
        Assert.NotNull(error);
    }

    private class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Footprint.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = "Test";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
    }
}
