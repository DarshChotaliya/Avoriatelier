using Purchase.Api.Entities;

namespace Purchase.Api.Services;

/// <summary>
/// Item photos are stored as JPEG data URLs, but lists send only a link to each photo
/// (/api/purchase-items/{id}/photo?v=…): sending every photo inside the purchase and stock lists made each page load
/// several megabytes. The browser fetches a photo when it is shown and keeps it (the v= part changes with the photo).
/// </summary>
public static class ItemPhoto
{
    private const string Route = "/api/purchase-items/";

    public static string? Url(PurchaseInvoiceItem item) =>
        string.IsNullOrEmpty(item.Photo) ? null : $"{Route}{item.Id}/photo?v={Version(item.Photo)}";

    /// <summary>A link from <see cref="Url"/> sent back on save: the item keeps the photo it has.</summary>
    public static bool IsLink(string? value) => value != null && value.StartsWith(Route, StringComparison.Ordinal);

    /// <summary>The picture bytes and their media type, or null when the stored value is not a data URL.</summary>
    public static (byte[] Bytes, string ContentType)? Decode(string? photo)
    {
        if (string.IsNullOrEmpty(photo) || !photo.StartsWith("data:", StringComparison.Ordinal)) return null;
        var comma = photo.IndexOf(',');
        if (comma < 0) return null;
        var head = photo[5..comma];
        if (!head.EndsWith(";base64", StringComparison.Ordinal)) return null;
        try
        {
            return (Convert.FromBase64String(photo[(comma + 1)..]), head[..^7]);
        }
        catch (FormatException)
        {
            return null;
        }
    }

    /// <summary>Short fingerprint of the photo (FNV-1a), so a changed photo gets a new link.</summary>
    private static string Version(string photo)
    {
        var hash = 2166136261u;
        foreach (var c in photo)
        {
            hash ^= c;
            hash *= 16777619u;
        }
        return hash.ToString("x8");
    }
}
