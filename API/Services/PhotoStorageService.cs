namespace Footprint.Services;

public interface IPhotoStorageService
{
    long MaxFileSizeBytes { get; }

    // Exposed so Program.cs can point the /uploads static-file mapping at
    // the same physical directory this service actually writes to, without
    // re-deriving (and risking drifting from) the fallback logic below.
    string UploadsPath { get; }

    bool IsValidPhoto(IFormFile file, out string? error);

    Task<string> SaveAsync(IFormFile file, CancellationToken ct = default);

    void Delete(string fileName);
}

public class PhotoStorageService : IPhotoStorageService
{
    public long MaxFileSizeBytes { get; } = 2 * 1024 * 1024;

    private static readonly Dictionary<string, string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
    };

    public string UploadsPath { get; }

    public PhotoStorageService(IWebHostEnvironment env, IConfiguration configuration)
    {
        // Defaults to wwwroot/uploads (unchanged local dev / docker-compose
        // behavior - docker-compose.yml already mounts a volume directly at
        // that path). Set Storage__UploadsPath to point this somewhere that
        // outlives the container filesystem, e.g. a Render persistent disk
        // mounted at /data - Storage__UploadsPath=/data/uploads.
        UploadsPath = configuration["Storage:UploadsPath"]
            ?? Path.Combine(env.ContentRootPath, "wwwroot", "uploads");
        Directory.CreateDirectory(UploadsPath);
    }

    public bool IsValidPhoto(IFormFile file, out string? error)
    {
        if (file.Length == 0)
        {
            error = $"{file.FileName} is empty.";
            return false;
        }

        if (file.Length > MaxFileSizeBytes)
        {
            error = $"{file.FileName} exceeds the 2MB size limit.";
            return false;
        }

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.TryGetValue(extension, out var expectedContentType) ||
            !string.Equals(expectedContentType, file.ContentType, StringComparison.OrdinalIgnoreCase))
        {
            error = $"{file.FileName} must be a JPG or PNG image.";
            return false;
        }

        error = null;
        return true;
    }

    public async Task<string> SaveAsync(IFormFile file, CancellationToken ct = default)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(UploadsPath, fileName);

        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream, ct);

        return fileName;
    }

    public void Delete(string fileName)
    {
        var fullPath = Path.Combine(UploadsPath, fileName);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }
}
