using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;

namespace Purchase.Api.Services;

/// <summary>
/// One row per SKU. Cost (purchase price incl. GST) and supplier details are only filled in for users allowed to
/// see them, so store staff can sell from stock without seeing purchase prices.
/// </summary>
public record StockRowDto(
    string SkuNo, string Category, string? Collection, string? DesignCode, string? SupplierName,
    string? SupplierInvoiceNo, DateOnly PurchaseDate, DateTime CreatedAt, string DiamondType, string MetalType,
    decimal NetWeight, decimal Mrp, decimal Discount, decimal SalePrice, decimal GstPercent, string? Thumb,
    int Purchased, int Available, decimal? CostPerPiece,
    decimal GrossWeight, string? Metal, decimal DiaPcs, decimal DiaWeight, decimal StonePcs, decimal StoneWeight);

public interface IStockService
{
    Task<List<StockRowDto>> GetAsync(CancellationToken ct);
}

public class StockService : IStockService
{
    private readonly PurchaseDbContext _db;
    private readonly ICurrentUser _user;

    public StockService(PurchaseDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    public async Task<List<StockRowDto>> GetAsync(CancellationToken ct)
    {
        var items = _db.PurchaseInvoiceItems.AsNoTracking().Include(i => i.PurchaseInvoice)
            .Include(i => i.Stones).Include(i => i.Diamonds).AsQueryable();
        if (_user.AllowedBranches is { } branches)
            items = items.Where(i => branches.Contains(i.PurchaseInvoice!.Branch));
        var list = await items.ToListAsync(ct);

        var skus = list.Select(i => i.SkuNo).ToList();
        var sold = await _db.SalesInvoiceLines.Where(l => skus.Contains(l.SkuNo))
            .GroupBy(l => l.SkuNo).Select(g => new { g.Key, Qty = g.Sum(l => l.Qty) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty, ct);

        // Metal of each quality (e.g. 18KT → Gold), for the bill's "GOLD (18KT)" column.
        var metals = (await _db.MetalTypes.AsNoTracking().ToListAsync(ct))
            .GroupBy(m => m.Name).ToDictionary(g => g.Key, g => g.First().Metal);
        var cost = _user.Has(Permissions.CostView);
        var supplier = _user.Has(Permissions.PurchaseView);
        return list.Select(i => new StockRowDto(
            i.SkuNo, i.Category, i.Collection, i.DesignCode,
            supplier ? i.PurchaseInvoice!.SupplierName : null, supplier ? i.PurchaseInvoice!.SupplierInvoiceNo : null,
            i.PurchaseInvoice!.PurchaseDate, i.PurchaseInvoice.CreatedAt, i.DiamondType, i.MetalType, i.NetWeight,
            i.Mrp, i.Discount, i.Mrp - i.Discount, i.GstPercent, ItemPhoto.Url(i), i.Qty,
            i.Qty - sold.GetValueOrDefault(i.SkuNo),
            cost ? ErpCalculator.PriceWithGst(i) : null,
            i.GrossWeight, metals.GetValueOrDefault(i.MetalType), i.Diamonds.Sum(d => d.Pcs), i.Diamonds.Sum(d => d.Weight),
            i.Stones.Sum(s => s.Pcs), i.Stones.Sum(s => s.Weight))).ToList();
    }
}
