namespace Footprint.Services;

public interface IPhotoStorageService
{
    long MaxFileSizeBytes { get; }

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

    private readonly string _uploadsPath;

    public PhotoStorageService(IWebHostEnvironment env)
    {
        _uploadsPath = Path.Combine(env.ContentRootPath, "wwwroot", "uploads");
        Directory.CreateDirectory(_uploadsPath);
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
        var fullPath = Path.Combine(_uploadsPath, fileName);

        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream, ct);

        return fileName;
    }

    public void Delete(string fileName)
    {
        var fullPath = Path.Combine(_uploadsPath, fileName);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }
}
