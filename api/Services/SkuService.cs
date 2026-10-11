using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Data;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public class SkuSettingRequest
{
    [Required, MaxLength(6)] public string CompanyPrefix { get; set; } = string.Empty;
    [Range(1, 4)] public int NameChars { get; set; } = 2;
    [Range(3, 6)] public int SeqDigits { get; set; } = 5;
    [MaxLength(1)] public string Separator { get; set; } = string.Empty;
    [Range(0, 9_999_999)] public int Counter { get; set; }
}

public record SkuSettingDto(string CompanyPrefix, int NameChars, int SeqDigits, string Separator, int Counter);

public interface ISkuService
{
    Task<SkuSettingDto> GetAsync(CancellationToken ct);
    Task<SkuSettingDto> SaveAsync(SkuSettingRequest request, CancellationToken ct);
}

/// <summary>
/// SKU numbering: Company prefix + item code + size + gender + running number, e.g. AV + RI + 14 + W + 00081 =
/// AVRI14W00081 (mirrors src/utils/skuFormat.js). One counter runs across every item; the format is set in
/// SKU Master → Format &amp; Counter Settings and only affects SKUs made afterwards.
/// </summary>
public class SkuService : ISkuService
{
    private readonly PurchaseDbContext _db;

    public SkuService(PurchaseDbContext db)
    {
        _db = db;
    }

    public async Task<SkuSettingDto> GetAsync(CancellationToken ct) => ToDto(await LoadAsync(_db, ct));

    public async Task<SkuSettingDto> SaveAsync(SkuSettingRequest r, CancellationToken ct)
    {
        var prefix = new string(r.CompanyPrefix.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        if (prefix.Length == 0) throw new BusinessValidationException("Company prefix is required (letters or digits).");
        if (r.Separator is not ("" or "-" or "/"))
            throw new BusinessValidationException("Separator must be none, a dash or a slash.");

        var s = await LoadAsync(_db, ct);
        s.CompanyPrefix = prefix;
        s.NameChars = r.NameChars;
        s.SeqDigits = r.SeqDigits;
        s.Separator = r.Separator;
        s.Counter = r.Counter;
        await _db.SaveChangesAsync(ct);
        return ToDto(s);
    }

    /// <summary>The one settings row, created with the defaults (AV, 2 letters, 5 digits) the first time.</summary>
    public static async Task<SkuSetting> LoadAsync(PurchaseDbContext db, CancellationToken ct)
    {
        var s = await db.SkuSettings.FirstOrDefaultAsync(ct);
        if (s is null)
        {
            s = new SkuSetting();
            db.SkuSettings.Add(s);
        }
        return s;
    }

    private static SkuSettingDto ToDto(SkuSetting s) => new(s.CompanyPrefix, s.NameChars, s.SeqDigits, s.Separator, s.Counter);
}

/// <summary>Builds SKUs from the settings (kept free of the database so it is easy to test).</summary>
public static class SkuFormatter
{
    /// <summary>First letters / digits of the item name, e.g. "Ring" → "RI", "Nose Pin" → "NO".</summary>
    public static string ItemCode(string? category, int chars)
    {
        var clean = new string((category ?? string.Empty).Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        return clean.Length <= chars ? clean : clean[..chars];
    }

    /// <summary>The digits of the size: "14" → "14", "16 in" → "16", "2-4" → "24", "12 × 18 mm" → "1218".</summary>
    public static string SizeCode(string? size) => new((size ?? string.Empty).Where(char.IsDigit).ToArray());

    /// <summary>W (women), M (men), K (kids), otherwise U (unisex) — from the item's collection.</summary>
    public static string GenderCode(string? collection)
    {
        var c = (collection ?? string.Empty).Trim().ToUpperInvariant();
        if (c.StartsWith("WOM") || c.StartsWith("LAD") || c.StartsWith("GIRL")) return "W";
        if (c.StartsWith("MEN") || c.StartsWith("MAN") || c.StartsWith("GENT") || c.StartsWith("BOY")) return "M";
        if (c.StartsWith("KID") || c.StartsWith("CHILD")) return "K";
        return "U";
    }

    /// <summary>`shortCode` is the category's own short form (Item Categories master); without one the name's first letters are used.</summary>
    public static string Build(SkuSetting s, string? category, string? size, string? collection, int sequence,
        string? shortCode = null)
    {
        var parts = new[]
        {
            s.CompanyPrefix, string.IsNullOrWhiteSpace(shortCode) ? ItemCode(category, s.NameChars) : shortCode,
            SizeCode(size), GenderCode(collection),
            sequence.ToString().PadLeft(s.SeqDigits, '0'),
        };
        return string.Join(s.Separator, parts.Where(p => p.Length > 0));
    }

    /// <summary>Next free SKU for an item: moves the counter on until the SKU is not in `taken`, and records it.</summary>
    public static string Next(SkuSetting s, string? category, string? size, string? collection, ICollection<string> taken,
        string? shortCode = null)
    {
        string sku;
        do
        {
            s.Counter++;
            sku = Build(s, category, size, collection, s.Counter, shortCode);
        }
        while (taken.Contains(sku));
        return sku;
    }
}
