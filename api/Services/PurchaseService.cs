using Microsoft.EntityFrameworkCore;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public class BusinessValidationException : Exception
{
    public BusinessValidationException(string message) : base(message)
    {
    }
}

public interface IPurchaseService
{
    Task<List<PurchaseListItemDto>> GetAllAsync(string? search, PurchaseType? type, CancellationToken ct);
    Task<PurchaseDto?> GetByIdAsync(int id, CancellationToken ct);
    Task<string> GetNextPurchaseNoAsync(CancellationToken ct);
    Task<PurchaseDto> CreateAsync(PurchaseRequest request, CancellationToken ct);
    Task<PurchaseDto?> UpdateAsync(int id, PurchaseRequest request, CancellationToken ct);
    Task<bool> DeleteAsync(int id, CancellationToken ct);
}

public class PurchaseService : IPurchaseService
{
    private const string PurchaseNoPrefix = "PUR-";
    private readonly PurchaseDbContext _db;

    public PurchaseService(PurchaseDbContext db)
    {
        _db = db;
    }

    public async Task<List<PurchaseListItemDto>> GetAllAsync(string? search, PurchaseType? type, CancellationToken ct)
    {
        var query = _db.Purchases.AsNoTracking();

        if (type.HasValue)
            query = query.Where(p => p.PurchaseType == type.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(p => EF.Functions.ILike(p.PurchaseNo, pattern)
                                     || EF.Functions.ILike(p.SupplierName, pattern)
                                     || (p.InvoiceNo != null && EF.Functions.ILike(p.InvoiceNo, pattern)));
        }

        return await query
            .OrderByDescending(p => p.PurchaseDate).ThenByDescending(p => p.Id)
            .Select(p => new PurchaseListItemDto(p.Id, p.PurchaseNo, p.PurchaseDate, p.SupplierName, p.InvoiceNo,
                p.PurchaseType, p.PaymentType, p.NetPurchaseAmount))
            .ToListAsync(ct);
    }

    public async Task<PurchaseDto?> GetByIdAsync(int id, CancellationToken ct)
    {
        var entity = await LoadAsync(id, ct, tracking: false);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<string> GetNextPurchaseNoAsync(CancellationToken ct)
    {
        var numbers = await _db.Purchases.AsNoTracking()
            .Where(p => p.PurchaseNo.StartsWith(PurchaseNoPrefix))
            .Select(p => p.PurchaseNo)
            .ToListAsync(ct);

        var max = numbers
            .Select(n => int.TryParse(n.AsSpan(PurchaseNoPrefix.Length), out var v) ? v : 0)
            .DefaultIfEmpty(0)
            .Max();

        return $"{PurchaseNoPrefix}{max + 1:D5}";
    }

    public async Task<PurchaseDto> CreateAsync(PurchaseRequest request, CancellationToken ct)
    {
        Validate(request);

        var entity = new PurchaseHeader { CreatedAt = DateTime.UtcNow };
        Apply(entity, request);
        entity.PurchaseNo = string.IsNullOrWhiteSpace(request.PurchaseNo)
            ? await GetNextPurchaseNoAsync(ct)
            : request.PurchaseNo.Trim();
        await EnsureUniquePurchaseNoAsync(entity.PurchaseNo, null, ct);

        _db.Purchases.Add(entity);
        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<PurchaseDto?> UpdateAsync(int id, PurchaseRequest request, CancellationToken ct)
    {
        Validate(request);

        var entity = await LoadAsync(id, ct, tracking: true);
        if (entity is null) return null;

        if (!string.IsNullOrWhiteSpace(request.PurchaseNo))
        {
            entity.PurchaseNo = request.PurchaseNo.Trim();
            await EnsureUniquePurchaseNoAsync(entity.PurchaseNo, id, ct);
        }

        // Line items are replaced wholesale; removing them from the collection deletes the rows.
        _db.DiamondItems.RemoveRange(entity.DiamondItems);
        _db.GoldItems.RemoveRange(entity.GoldItems);
        _db.SilverItems.RemoveRange(entity.SilverItems);
        entity.DiamondItems.Clear();
        entity.GoldItems.Clear();
        entity.SilverItems.Clear();

        Apply(entity, request);
        await _db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var deleted = await _db.Purchases.Where(p => p.Id == id).ExecuteDeleteAsync(ct);
        return deleted > 0;
    }

    private Task<PurchaseHeader?> LoadAsync(int id, CancellationToken ct, bool tracking)
    {
        var query = _db.Purchases
            .Include(p => p.DiamondItems.OrderBy(i => i.Id))
            .Include(p => p.GoldItems.OrderBy(i => i.Id))
            .Include(p => p.SilverItems.OrderBy(i => i.Id))
            .AsSplitQuery();
        if (!tracking) query = query.AsNoTracking();
        return query.FirstOrDefaultAsync(p => p.Id == id, ct);
    }

    private async Task EnsureUniquePurchaseNoAsync(string purchaseNo, int? excludeId, CancellationToken ct)
    {
        var exists = await _db.Purchases.AnyAsync(p => p.PurchaseNo == purchaseNo && p.Id != excludeId, ct);
        if (exists)
            throw new BusinessValidationException($"Purchase No. '{purchaseNo}' already exists.");
    }

    private static void Validate(PurchaseRequest r)
    {
        var count = r.PurchaseType switch
        {
            PurchaseType.Diamond => r.DiamondItems.Count,
            PurchaseType.Gold => r.GoldItems.Count,
            PurchaseType.Silver => r.SilverItems.Count,
            _ => 0
        };
        if (count == 0)
            throw new BusinessValidationException($"At least one {r.PurchaseType} item is required.");

        if (r.GoldItems.Any(i => i.StoneWeight > i.GrossWeight) ||
            r.SilverItems.Any(i => i.StoneWeight > i.GrossWeight))
            throw new BusinessValidationException("Stone weight cannot be more than gross weight.");
    }

    private static void Apply(PurchaseHeader e, PurchaseRequest r)
    {
        e.PurchaseDate = r.PurchaseDate;
        e.SupplierName = r.SupplierName.Trim();
        e.InvoiceNo = r.InvoiceNo?.Trim();
        e.PurchaseType = r.PurchaseType;
        e.PaymentType = r.PaymentType.Trim();
        e.Remarks = r.Remarks?.Trim();
        e.Discount = r.Discount;
        e.CgstPercent = r.CgstPercent;
        e.SgstPercent = r.SgstPercent;
        e.IgstPercent = r.IgstPercent;
        e.UpdatedAt = DateTime.UtcNow;

        // Only the items matching the selected purchase type are kept.
        switch (r.PurchaseType)
        {
            case PurchaseType.Diamond:
                e.DiamondItems.AddRange(r.DiamondItems.Select(i => new DiamondItem
                {
                    PacketLotNo = i.PacketLotNo, Shape = i.Shape, SizeMm = i.SizeMm, Carat = i.Carat, Color = i.Color,
                    Clarity = i.Clarity, Cut = i.Cut, Polish = i.Polish, Symmetry = i.Symmetry,
                    Fluorescence = i.Fluorescence, CertificateLab = i.CertificateLab, CertificateNo = i.CertificateNo,
                    CertificateDate = i.CertificateDate, Quantity = i.Quantity, RatePerCarat = i.RatePerCarat,
                    DiscountPercent = i.DiscountPercent
                }));
                break;
            case PurchaseType.Gold:
                e.GoldItems.AddRange(r.GoldItems.Select(i => new GoldItem
                {
                    GoldType = i.GoldType, Purity = i.Purity, GrossWeight = i.GrossWeight,
                    StoneWeight = i.StoneWeight, WastagePercent = i.WastagePercent, RatePerGram = i.RatePerGram,
                    MakingCharges = i.MakingCharges, OtherCharges = i.OtherCharges
                }));
                break;
            case PurchaseType.Silver:
                e.SilverItems.AddRange(r.SilverItems.Select(i => new SilverItem
                {
                    SilverType = i.SilverType, Purity = i.Purity, GrossWeight = i.GrossWeight,
                    StoneWeight = i.StoneWeight, RatePerGram = i.RatePerGram, MakingCharges = i.MakingCharges,
                    OtherCharges = i.OtherCharges
                }));
                break;
        }

        PurchaseCalculator.CalculateTotals(e);
    }

    private static PurchaseDto ToDto(PurchaseHeader p) => new()
    {
        Id = p.Id,
        PurchaseNo = p.PurchaseNo,
        PurchaseDate = p.PurchaseDate,
        SupplierName = p.SupplierName,
        InvoiceNo = p.InvoiceNo,
        PurchaseType = p.PurchaseType,
        PaymentType = p.PaymentType,
        Remarks = p.Remarks,
        GrossAmount = p.GrossAmount,
        Discount = p.Discount,
        TaxableAmount = p.TaxableAmount,
        CgstPercent = p.CgstPercent,
        CgstAmount = p.CgstAmount,
        SgstPercent = p.SgstPercent,
        SgstAmount = p.SgstAmount,
        IgstPercent = p.IgstPercent,
        IgstAmount = p.IgstAmount,
        RoundOff = p.RoundOff,
        NetPurchaseAmount = p.NetPurchaseAmount,
        DiamondItems = p.DiamondItems.Select(i => new DiamondItemDto(i.Id, i.PacketLotNo, i.Shape, i.SizeMm, i.Carat,
            i.Color, i.Clarity, i.Cut, i.Polish, i.Symmetry, i.Fluorescence, i.CertificateLab, i.CertificateNo,
            i.CertificateDate,
            i.Quantity, i.RatePerCarat, i.DiscountPercent, i.Amount, i.AvgWeight, i.AvgPrice)).ToList(),
        GoldItems = p.GoldItems.Select(i => new GoldItemDto(i.Id, i.GoldType, i.Purity, i.GrossWeight,
            i.StoneWeight, i.NetWeight, i.WastagePercent, i.WastageWeight, i.ChargeableWeight, i.RatePerGram,
            i.GoldValue, i.MakingCharges, i.OtherCharges, i.Amount)).ToList(),
        SilverItems = p.SilverItems.Select(i => new SilverItemDto(i.Id, i.SilverType, i.Purity, i.GrossWeight,
            i.StoneWeight, i.NetWeight, i.RatePerGram, i.SilverValue, i.MakingCharges, i.OtherCharges,
            i.Amount)).ToList()
    };
}
