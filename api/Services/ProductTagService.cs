using Microsoft.EntityFrameworkCore;
using Purchase.Api.Data;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

/// <summary>The same design's approximate metal value in another metal quality, at today's quotation rate.</summary>
public record MetalPriceDto(string Quality, string Metal, decimal Weight, decimal Rate, decimal MetalValue);

/// <summary>Diamonds / stones set in the piece: what and how much, never their rates.</summary>
public record TagStoneDto(string Kind, string? Name, string? Shape, string? Color, string? Size, decimal Pcs, decimal Weight);

/// <summary>
/// What a QR tag shows when scanned: the piece and its metal value in every quality (e.g. a silver ring in 14K / 18K
/// gold). Public, so it holds nothing private: no cost, supplier, MRP or sale price.
/// </summary>
public record ProductTagDto(
    string SkuNo, string Category, string? Collection, string? DesignCode, string? Size, string? Description,
    string MetalType, string? Metal, decimal NetWeight, decimal GrossWeight, string DiamondType, string? Photo,
    bool InStock, List<MetalPriceDto> MetalPrices, DateTime? RatesUpdatedAt, List<TagStoneDto> Stones,
    decimal DiamondCt, decimal StoneCt);

public interface IProductTagService
{
    Task<ProductTagDto?> GetAsync(string skuNo, CancellationToken ct);
}

public class ProductTagService : IProductTagService
{
    private readonly PurchaseDbContext _db;

    public ProductTagService(PurchaseDbContext db)
    {
        _db = db;
    }

    public async Task<ProductTagDto?> GetAsync(string skuNo, CancellationToken ct)
    {
        var sku = skuNo.Trim().ToUpperInvariant();
        var item = await _db.PurchaseInvoiceItems.AsNoTracking().Include(i => i.Stones).Include(i => i.Diamonds)
            .FirstOrDefaultAsync(i => i.SkuNo.ToUpper() == sku, ct);
        if (item is null) return null;

        var sold = await _db.SalesInvoiceLines.Where(l => l.SkuNo == item.SkuNo).SumAsync(l => (int?)l.Qty, ct) ?? 0;
        var metals = await _db.MetalTypes.AsNoTracking().OrderBy(m => m.Id).ToListAsync(ct);
        var own = metals.FirstOrDefault(m => m.Name == item.MetalType);
        var fromFactor = own?.WeightFactor > 0 ? own.WeightFactor : 1m;

        // Same design in each quality: weight × (its factor ÷ this metal's factor) × today's quotation rate.
        // Listed metal by metal (silver, gold, platinum), lowest purity first: 9KT, 14KT, 18KT, 22KT.
        var metalOrder = new[] { "Silver", "Gold", "Platinum" };
        var prices = metals.Where(m => m.QuoteRate > 0)
            .OrderBy(m => Array.IndexOf(metalOrder, m.Metal) is var i && i < 0 ? metalOrder.Length : i)
            .ThenBy(m => m.Purity).ThenBy(m => m.Name)
            .Select(m =>
        {
            var weight = QuotationCalculator.ConvertWeight(item.NetWeight, fromFactor, m.WeightFactor > 0 ? m.WeightFactor : 1m);
            return new MetalPriceDto(m.Name, m.Metal, weight, m.QuoteRate,
                Math.Round(weight * m.QuoteRate, 2, MidpointRounding.AwayFromZero));
        }).ToList();
        var ratesUpdatedAt = await _db.DailyMetalRates.AsNoTracking().MaxAsync(r => (DateTime?)r.UpdatedAt, ct);

        var stones = item.Diamonds.OrderBy(d => d.SortOrder)
            .Select(d => new TagStoneDto("Diamond", d.DiamondType, d.Code, null, d.Size, d.Pcs, d.Weight))
            .Concat(item.Stones.OrderBy(s => s.SortOrder)
                .Select(s => new TagStoneDto("Stone", s.StoneName, s.StoneType, s.Color, s.Size, s.Pcs, s.Weight)))
            .ToList();

        return new ProductTagDto(item.SkuNo, item.Category, item.Collection, item.DesignCode, item.Size,
            item.Description, item.MetalType, own?.Metal, item.NetWeight, item.GrossWeight, item.DiamondType, item.Photo,
            item.Qty - sold > 0, prices, ratesUpdatedAt, stones,
            item.Diamonds.Sum(d => d.Weight), item.Stones.Sum(s => s.Weight));
    }
}
