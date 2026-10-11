using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public interface IQuotationService
{
    Task<List<QuotationDto>> GetAllAsync(CancellationToken ct);
    Task<QuotationDto> CreateAsync(QuotationRequest request, CancellationToken ct);
    Task<QuotationDto?> UpdateAsync(int id, QuotationRequest request, CancellationToken ct);
    Task<bool> DeleteAsync(int id, CancellationToken ct);
}

/// <summary>
/// Quotations: the price of a design from stock made in another metal (e.g. a silver ring quoted in 18KT gold).
/// Nothing is taken from stock. Like sales, users see their own quotations unless they have sales.viewAll.
/// </summary>
public class QuotationService : IQuotationService
{
    private const string Prefix = "QT-";
    private readonly PurchaseDbContext _db;
    private readonly ICurrentUser _user;

    public QuotationService(PurchaseDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    private IQueryable<Quotation> Visible()
    {
        IQueryable<Quotation> quotes = _db.Quotations;
        if (_user.AllowedBranches is { } branches) quotes = quotes.Where(q => branches.Contains(q.Branch));
        if (!_user.Has(Permissions.SalesViewAll))
        {
            var username = _user.Username;
            quotes = quotes.Where(q => q.CreatedBy == username);
        }
        return quotes;
    }

    public async Task<List<QuotationDto>> GetAllAsync(CancellationToken ct)
    {
        var quotes = await Visible().AsNoTracking().Include(q => q.Lines)
            .OrderByDescending(q => q.QuotationDate).ThenByDescending(q => q.Id)
            .ToListAsync(ct);
        return quotes.Select(ToDto).ToList();
    }

    public async Task<QuotationDto> CreateAsync(QuotationRequest r, CancellationToken ct)
    {
        await ValidateAsync(r, ct);
        var now = DateTime.UtcNow;
        var quote = new Quotation
        {
            QuotationNo = ErpNumbers.Next(Prefix, await _db.Quotations.Select(q => q.QuotationNo).ToListAsync(ct)),
            CreatedAt = now,
            CreatedBy = _user.Username,
        };
        Apply(quote, r, now);
        _db.Quotations.Add(quote);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new BusinessValidationException("Another quotation took the same number just now. Please save again.");
        }
        return ToDto(quote);
    }

    public async Task<QuotationDto?> UpdateAsync(int id, QuotationRequest r, CancellationToken ct)
    {
        var quote = await Visible().Include(q => q.Lines).FirstOrDefaultAsync(q => q.Id == id, ct);
        if (quote is null) return null;
        await ValidateAsync(r, ct);
        _db.RemoveRange(quote.Lines);
        Apply(quote, r, DateTime.UtcNow);
        await _db.SaveChangesAsync(ct);
        return ToDto(quote);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var quote = await Visible().Include(q => q.Lines).FirstOrDefaultAsync(q => q.Id == id, ct);
        if (quote is null) return false;
        _db.Quotations.Remove(quote);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private async Task ValidateAsync(QuotationRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.Branch)) throw new BusinessValidationException("Branch is required.");
        if (!_user.CanUseBranch(r.Branch))
            throw new BusinessValidationException($"You do not have access to branch {r.Branch}.");
        if (string.IsNullOrWhiteSpace(r.CustomerName)) throw new BusinessValidationException("Customer name is required.");
        if (!QuotationStatus.All.Contains(r.Status))
            throw new BusinessValidationException($"Status must be one of: {string.Join(", ", QuotationStatus.All)}.");
        if (r.Lines.Count == 0) throw new BusinessValidationException("Add at least one item.");
        if (r.Lines.Any(l => !l.IsCustom && string.IsNullOrWhiteSpace(l.SkuNo)))
            throw new BusinessValidationException("Pick a SKU for every design from stock.");
        if (r.Lines.Any(l => l.IsCustom && string.IsNullOrWhiteSpace(l.Category) && string.IsNullOrWhiteSpace(l.Description)))
            throw new BusinessValidationException("Give every custom design a category or a description.");
        if (r.Lines.Any(l => l.Weight <= 0)) throw new BusinessValidationException("Every line needs a weight.");
        if (r.Lines.Any(l => l.LabourType is not (LabourType.PerGram or LabourType.Percent)))
            throw new BusinessValidationException("Labour must be per gram or % of metal value.");

        var metals = r.Lines.Select(l => l.ToMetal.Trim()).Distinct().ToList();
        var known = await _db.MetalTypes.Where(m => metals.Contains(m.Name)).Select(m => m.Name).ToListAsync(ct);
        var unknown = metals.Except(known).FirstOrDefault();
        if (unknown is not null)
            throw new BusinessValidationException($"Metal {unknown} is not in Masters → Metal Types.");
    }

    private void Apply(Quotation q, QuotationRequest r, DateTime now)
    {
        string? Text(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
        q.QuotationDate = r.QuotationDate;
        q.Branch = r.Branch.Trim();
        q.CustomerName = r.CustomerName.Trim();
        q.ContactNo = Text(r.ContactNo);
        q.Status = r.Status;
        q.Notes = Text(r.Notes);
        q.Advance = r.Advance;
        q.UpdatedAt = now;
        q.UpdatedBy = _user.Username;
        q.Lines = r.Lines.Select((l, i) => new QuotationLine
        {
            SortOrder = i, IsCustom = l.IsCustom,
            Photo = l.IsCustom ? Text(l.Photo) : null, DesignLink = l.IsCustom ? Text(l.DesignLink) : null,
            Category = Text(l.Category), Size = Text(l.Size),
            SkuNo = l.IsCustom ? string.Empty : l.SkuNo.Trim(), Description = Text(l.Description),
            FromMetal = l.IsCustom ? string.Empty : l.FromMetal.Trim(), FromWeight = l.IsCustom ? 0 : l.FromWeight,
            ToMetal = l.ToMetal.Trim(), Weight = l.Weight, Qty = l.Qty,
            MetalRate = l.MetalRate, LabourType = l.LabourType, LabourRate = l.LabourRate,
            DiamondCt = l.DiamondCt, DiamondRate = l.DiamondRate, StoneAmount = l.StoneAmount,
            OtherCharges = l.OtherCharges, CadCharge = l.CadCharge, GstPercent = l.GstPercent,
        }).ToList();
    }

    private static QuotationDto ToDto(Quotation q)
    {
        var lines = q.Lines.OrderBy(l => l.SortOrder).Select(l =>
        {
            var c = QuotationCalculator.Line(l);
            return new QuotationLineDto
            {
                IsCustom = l.IsCustom, Photo = l.Photo, DesignLink = l.DesignLink, Category = l.Category, Size = l.Size,
                DiamondCt = l.DiamondCt, DiamondRate = l.DiamondRate, CadCharge = l.CadCharge, DiamondAmount = c.Diamond,
                SkuNo = l.SkuNo, Description = l.Description, FromMetal = l.FromMetal, FromWeight = l.FromWeight,
                ToMetal = l.ToMetal, Weight = l.Weight, Qty = l.Qty, MetalRate = l.MetalRate, LabourType = l.LabourType,
                LabourRate = l.LabourRate, StoneAmount = l.StoneAmount, OtherCharges = l.OtherCharges,
                GstPercent = l.GstPercent, MetalAmount = c.Metal, LabourAmount = c.Labour, Taxable = c.Taxable,
                Gst = c.Gst, Total = c.Total,
            };
        }).ToList();
        var grandTotal = Math.Round(lines.Sum(l => l.Total), 0, MidpointRounding.AwayFromZero);
        return new QuotationDto(q.Id, q.QuotationNo, q.QuotationDate, q.Branch, q.CustomerName, q.ContactNo, q.Status,
            q.Notes, q.CreatedAt, q.CreatedBy, lines, lines.Sum(l => l.Taxable), lines.Sum(l => l.Gst), grandTotal,
            q.Advance, grandTotal - q.Advance);
    }
}

/// <summary>
/// Quotation line (mirrors src/utils/quotationCalc.js), prices before GST:
///   Metal   = Weight × Metal rate/g
///   Labour  = per gram: Weight × Labour rate · percent: Metal × Labour rate %
///   Diamond = Diamond ct × Rate per ct
///   Taxable = (Metal + Labour + Diamond + Stones + Other) × Qty + CAD charge (once)
///   GST     = Taxable × GST %;  Total = Taxable + GST
/// </summary>
public static class QuotationCalculator
{
    public record LineAmounts(decimal Metal, decimal Labour, decimal Diamond, decimal Taxable, decimal Gst, decimal Total);

    private static decimal Money(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    public static LineAmounts Line(QuotationLine l)
    {
        var metal = Money(l.Weight * l.MetalRate);
        var labour = Money(l.LabourType == LabourType.Percent ? metal * l.LabourRate / 100m : l.Weight * l.LabourRate);
        var diamond = Money(l.DiamondCt * l.DiamondRate);
        var taxable = Money((metal + labour + diamond + l.StoneAmount + l.OtherCharges) * l.Qty + l.CadCharge);
        var gst = Money(taxable * l.GstPercent / 100m);
        return new LineAmounts(metal, labour, diamond, taxable, gst, taxable + gst);
    }

    /// <summary>Net weight of the same design in another metal: weight × (to factor ÷ from factor).</summary>
    public static decimal ConvertWeight(decimal weight, decimal fromFactor, decimal toFactor) =>
        fromFactor <= 0 || toFactor <= 0
            ? weight
            : Math.Round(weight * toFactor / fromFactor, 3, MidpointRounding.AwayFromZero);
}
