using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public record MetalRateDto(string Metal, decimal Rate, DateTime? UpdatedAt, string? UpdatedBy);

public class MetalRatesRequest
{
    public decimal Gold { get; set; }
    public decimal Silver { get; set; }
    public decimal Platinum { get; set; }
}

public interface IMetalRateService
{
    Task<List<MetalRateDto>> GetAsync(CancellationToken ct);
    Task<List<MetalRateDto>> SaveAsync(MetalRatesRequest request, CancellationToken ct);
}

/// <summary>
/// Today's 999 rates (gold, silver, platinum) for quotations, like the client's METAL CALCULATION sheet: each metal quality's
/// quotation rate = its metal's 999 rate × the quality's quotation % (e.g. 18KT = 14,900 × 78% = 11,622).
/// Purchases never use these rates.
/// </summary>
public class MetalRateService : IMetalRateService
{
    public static readonly string[] Metals = { "Gold", "Silver", "Platinum" };
    private readonly PurchaseDbContext _db;
    private readonly ICurrentUser _user;

    public MetalRateService(PurchaseDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<List<MetalRateDto>> GetAsync(CancellationToken ct)
    {
        var rates = await _db.DailyMetalRates.AsNoTracking().ToListAsync(ct);
        return Metals.Select(m => rates.FirstOrDefault(r => r.Metal == m) is { } r
            ? new MetalRateDto(m, r.Rate, r.UpdatedAt, r.UpdatedBy)
            : new MetalRateDto(m, 0m, null, null)).ToList();
    }

    public async Task<List<MetalRateDto>> SaveAsync(MetalRatesRequest r, CancellationToken ct)
    {
        if (r.Gold < 0 || r.Silver < 0 || r.Platinum < 0)
            throw new BusinessValidationException("Rates cannot be negative.");
        var now = DateTime.UtcNow;
        foreach (var (metal, rate) in new[] { ("Gold", r.Gold), ("Silver", r.Silver), ("Platinum", r.Platinum) })
        {
            var row = await _db.DailyMetalRates.FirstOrDefaultAsync(x => x.Metal == metal, ct);
            if (row is null) _db.DailyMetalRates.Add(row = new DailyMetalRate { Metal = metal });
            row.Rate = rate;
            row.UpdatedAt = now;
            row.UpdatedBy = _user.Username;
        }
        await _db.SaveChangesAsync(ct);

        var bases = new Dictionary<string, decimal>
        {
            ["Gold"] = r.Gold, ["Silver"] = r.Silver, ["Platinum"] = r.Platinum,
        };
        foreach (var m in await _db.MetalTypes.ToListAsync(ct)) ApplyQuoteRate(m, bases);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(ct);
    }

    /// <summary>Quotation rate = 999 rate of the quality's metal × its quotation % (left as is without both).</summary>
    public static void ApplyQuoteRate(MetalTypeMaster m, IReadOnlyDictionary<string, decimal> bases)
    {
        if (m.QuotePercent > 0 && bases.TryGetValue(m.Metal, out var rate) && rate > 0)
            m.QuoteRate = Math.Round(rate * m.QuotePercent / 100m, 2, MidpointRounding.AwayFromZero);
    }

    public static async Task<Dictionary<string, decimal>> BasesAsync(PurchaseDbContext db, CancellationToken ct) =>
        await db.DailyMetalRates.AsNoTracking().ToDictionaryAsync(x => x.Metal, x => x.Rate, ct);
}
