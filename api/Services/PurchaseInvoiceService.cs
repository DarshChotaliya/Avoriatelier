using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public interface IPurchaseInvoiceService
{
    Task<List<PurchaseInvoiceDto>> GetAllAsync(CancellationToken ct);
    Task<PurchaseInvoiceDto> CreateAsync(PurchaseInvoiceRequest request, CancellationToken ct);
    Task<PurchaseInvoiceDto?> UpdateAsync(int id, PurchaseInvoiceRequest request, CancellationToken ct);
    Task<bool> DeleteAsync(int id, CancellationToken ct);
    Task<bool> DeleteItemAsync(int invoiceId, int itemId, CancellationToken ct);
    Task<string> RenameSkuAsync(string oldSku, string newSku, CancellationToken ct);
}

/// <summary>
/// Purchase invoices laid out like the supplier packing list. Each item is one SKU; stock of a SKU is its
/// purchased qty minus the qty on sales invoices, so sold items cannot be removed or reduced below what was sold.
/// </summary>
public class PurchaseInvoiceService : IPurchaseInvoiceService
{
    private readonly PurchaseDbContext _db;
    private readonly ICurrentUser _user;

    public PurchaseInvoiceService(PurchaseDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    /// <summary>Invoices of the branches this user works in (all branches when unrestricted).</summary>
    private IQueryable<PurchaseInvoice> Visible(IQueryable<PurchaseInvoice> q) =>
        _user.AllowedBranches is { } branches ? q.Where(p => branches.Contains(p.Branch)) : q;

    private void RequireBranch(string branch)
    {
        if (!_user.CanUseBranch(branch))
            throw new BusinessValidationException($"You do not have access to branch {branch}.");
    }

    public async Task<List<PurchaseInvoiceDto>> GetAllAsync(CancellationToken ct)
    {
        var invoices = await Visible(Query()).AsNoTracking()
            .OrderByDescending(p => p.PurchaseDate).ThenByDescending(p => p.Id)
            .ToListAsync(ct);
        return invoices.Select(ToDto).ToList();
    }

    public async Task<PurchaseInvoiceDto> CreateAsync(PurchaseInvoiceRequest request, CancellationToken ct)
    {
        Validate(request);
        RequireBranch(request.Branch);
        var now = DateTime.UtcNow;
        var invoice = new PurchaseInvoice { CreatedAt = now, CreatedBy = _user.Username, UpdatedBy = _user.Username };
        ApplyHeader(invoice, request, now);

        var prefixes = await SkuService.LoadAsync(_db, ct);
        var taken = await _db.PurchaseInvoiceItems.Select(i => i.SkuNo).ToListAsync(ct);
        for (var i = 0; i < request.Items.Count; i++)
        {
            var item = new PurchaseInvoiceItem { SkuNo = await NewSkuAsync(request.Items[i], prefixes, taken, ct) };
            ApplyItem(item, request.Items[i], i);
            invoice.Items.Add(item);
        }

        _db.PurchaseInvoices.Add(invoice);
        await SaveAsync(ct);
        return ToDto(invoice);
    }

    public async Task<PurchaseInvoiceDto?> UpdateAsync(int id, PurchaseInvoiceRequest request, CancellationToken ct)
    {
        Validate(request);
        RequireBranch(request.Branch);
        var invoice = await Visible(Query()).FirstOrDefaultAsync(p => p.Id == id, ct);
        if (invoice is null) return null;

        var sold = await SoldQtyAsync(invoice.Items.Select(i => i.SkuNo), ct);
        var keptIds = request.Items.Where(i => i.Id is not null).Select(i => i.Id!.Value).ToHashSet();

        foreach (var old in invoice.Items.Where(i => !keptIds.Contains(i.Id)).ToList())
        {
            if (sold.GetValueOrDefault(old.SkuNo) > 0)
                throw new BusinessValidationException($"{old.SkuNo} is used in a sales invoice and cannot be removed.");
            invoice.Items.Remove(old);
        }

        var now = DateTime.UtcNow;
        ApplyHeader(invoice, request, now);
        invoice.UpdatedBy = _user.Username;
        var prefixes = await SkuService.LoadAsync(_db, ct);
        var taken = await _db.PurchaseInvoiceItems.Select(i => i.SkuNo).ToListAsync(ct);

        for (var i = 0; i < request.Items.Count; i++)
        {
            var row = request.Items[i];
            var item = row.Id is null ? null : invoice.Items.FirstOrDefault(x => x.Id == row.Id);
            if (row.Id is not null && item is null)
                throw new BusinessValidationException("An item on this invoice no longer exists. Reload and try again.");

            if (item is null)
            {
                item = new PurchaseInvoiceItem { SkuNo = await NewSkuAsync(row, prefixes, taken, ct) };
                invoice.Items.Add(item);
            }
            else
            {
                var soldQty = sold.GetValueOrDefault(item.SkuNo);
                if (row.Qty < soldQty)
                    throw new BusinessValidationException(
                        $"{item.SkuNo}: {soldQty} already sold, so qty cannot be less than {soldQty}.");
                // Stone and diamond rows are replaced wholesale.
                item.Stones.Clear();
                item.Diamonds.Clear();
            }
            ApplyItem(item, row, i);
        }

        await SaveAsync(ct);
        return ToDto(invoice);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var invoice = await Visible(_db.PurchaseInvoices).Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id, ct);
        if (invoice is null) return false;

        var sold = await SoldQtyAsync(invoice.Items.Select(i => i.SkuNo), ct);
        var soldSkus = invoice.Items.Where(i => sold.GetValueOrDefault(i.SkuNo) > 0).Select(i => i.SkuNo).ToList();
        if (soldSkus.Count > 0)
            throw new BusinessValidationException(
                $"{string.Join(", ", soldSkus)} {(soldSkus.Count == 1 ? "is" : "are")} used in sales invoices. Delete those sales first.");

        _db.PurchaseInvoices.Remove(invoice);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>Removes one item; an invoice with no items left is removed too.</summary>
    public async Task<bool> DeleteItemAsync(int invoiceId, int itemId, CancellationToken ct)
    {
        var invoice = await Visible(_db.PurchaseInvoices).Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == invoiceId, ct);
        var item = invoice?.Items.FirstOrDefault(i => i.Id == itemId);
        if (invoice is null || item is null) return false;

        if ((await SoldQtyAsync(new[] { item.SkuNo }, ct)).GetValueOrDefault(item.SkuNo) > 0)
            throw new BusinessValidationException($"{item.SkuNo} is used in a sales invoice. Delete that sale first.");

        invoice.Items.Remove(item);
        if (invoice.Items.Count == 0) _db.PurchaseInvoices.Remove(invoice);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>Fixes a SKU number (typo / sequence gap). Sold SKUs keep their number because sales refer to it.</summary>
    public async Task<string> RenameSkuAsync(string oldSku, string newSku, CancellationToken ct)
    {
        var next = newSku.Trim().ToUpperInvariant();
        if (next.Length == 0) throw new BusinessValidationException("SKU No. is required.");

        var item = await _db.PurchaseInvoiceItems.Include(i => i.PurchaseInvoice)
                       .FirstOrDefaultAsync(i => i.SkuNo == oldSku, ct)
                   ?? throw new BusinessValidationException($"SKU {oldSku} was not found.");
        RequireBranch(item.PurchaseInvoice!.Branch);
        if (next == item.SkuNo) return next;
        if (await _db.SalesInvoiceLines.AnyAsync(l => l.SkuNo == oldSku, ct))
            throw new BusinessValidationException($"{oldSku} is already used in a sales invoice, so its number cannot change.");
        if (await _db.PurchaseInvoiceItems.AnyAsync(i => i.SkuNo == next, ct))
            throw new BusinessValidationException($"SKU {next} already exists.");

        item.SkuNo = next;
        await _db.SaveChangesAsync(ct);
        return next;
    }

    // ---------- helpers ----------

    // Rows are put in SortOrder by ToDto.
    private IQueryable<PurchaseInvoice> Query() => _db.PurchaseInvoices
        .Include(p => p.Items).ThenInclude(i => i.Stones)
        .Include(p => p.Items).ThenInclude(i => i.Diamonds)
        .AsSplitQuery();

    private async Task<Dictionary<string, int>> SoldQtyAsync(IEnumerable<string> skus, CancellationToken ct)
    {
        var list = skus.ToList();
        return await _db.SalesInvoiceLines.Where(l => list.Contains(l.SkuNo))
            .GroupBy(l => l.SkuNo)
            .Select(g => new { g.Key, Qty = g.Sum(l => l.Qty) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty, ct);
    }

    /// <summary>
    /// Imported SKU if given and free; otherwise the next SKU from the SKU settings
    /// (company prefix + item code + size + gender + running number).
    /// </summary>
    private async Task<string> NewSkuAsync(PurchaseItemRequest row, SkuSetting prefixes,
        List<string> taken, CancellationToken ct)
    {
        string sku;
        if (!string.IsNullOrWhiteSpace(row.SkuNo))
        {
            sku = row.SkuNo.Trim().ToUpperInvariant();
            if (taken.Contains(sku) || await _db.PurchaseInvoiceItems.AnyAsync(i => i.SkuNo == sku, ct))
                throw new BusinessValidationException($"SKU {sku} already exists.");
        }
        else
        {
            var shortCode = await _db.ItemCategories.Where(c => c.Name == row.Category).Select(c => c.ShortCode)
                .FirstOrDefaultAsync(ct);
            sku = SkuFormatter.Next(prefixes, row.Category, row.Size, row.Collection, taken, shortCode);
        }
        taken.Add(sku);
        return sku;
    }

    private static void Validate(PurchaseInvoiceRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Branch)) throw new BusinessValidationException("Branch is required.");
        if (string.IsNullOrWhiteSpace(r.SupplierName)) throw new BusinessValidationException("Supplier is required.");
        if (r.Items.Count == 0) throw new BusinessValidationException("Add at least one item.");
        for (var i = 0; i < r.Items.Count; i++)
        {
            var it = r.Items[i];
            var n = $"Item {i + 1}";
            if (string.IsNullOrWhiteSpace(it.Category)) throw new BusinessValidationException($"{n}: category is required.");
            if (string.IsNullOrWhiteSpace(it.DiamondType)) throw new BusinessValidationException($"{n}: diamond type is required.");
            if (string.IsNullOrWhiteSpace(it.MetalType)) throw new BusinessValidationException($"{n}: metal is required.");
            if (it.NetWeight <= 0) throw new BusinessValidationException($"{n}: net weight is required.");
            if (it.GrossWeight > 0 && it.NetWeight > it.GrossWeight)
                throw new BusinessValidationException($"{n}: net weight cannot be more than gross weight.");
            if (it.Discount > it.Mrp) throw new BusinessValidationException($"{n}: discount cannot be more than MRP.");
            if (it.Stones.Any(s => string.IsNullOrWhiteSpace(s.StoneType) || (s.Weight <= 0 && s.Pcs <= 0)))
                throw new BusinessValidationException($"{n}: every stone needs a shape and a weight or piece count.");
            if (it.Diamonds.Any(d => d.Weight <= 0))
                throw new BusinessValidationException($"{n}: every diamond needs a weight.");
        }
    }

    private static string? Text(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static void ApplyHeader(PurchaseInvoice p, PurchaseInvoiceRequest r, DateTime now)
    {
        p.PurchaseDate = r.PurchaseDate;
        p.Branch = r.Branch.Trim();
        p.SupplierName = r.SupplierName.Trim();
        p.SupplierInvoiceNo = Text(r.SupplierInvoiceNo);
        p.SupplierInvoiceDate = r.SupplierInvoiceDate;
        p.Remarks = Text(r.Remarks);
        p.Igst = r.Igst;
        p.UpdatedAt = now;
    }

    private static void ApplyItem(PurchaseInvoiceItem e, PurchaseItemRequest r, int order)
    {
        e.SortOrder = order;
        e.Category = r.Category.Trim();
        e.DesignCode = Text(r.DesignCode);
        e.Collection = Text(r.Collection);
        e.Size = Text(r.Size);
        e.DiamondType = r.DiamondType.Trim();
        e.MetalType = r.MetalType.Trim();
        e.Qty = r.Qty;
        e.GrossWeight = r.GrossWeight;
        e.NetWeight = r.NetWeight;
        e.MetalRate = r.MetalRate;
        e.LabourRate = r.LabourRate;
        e.LabourFixed = r.LabourFixed;
        e.LabourMinimum = r.LabourMinimum;
        e.Hallmark = r.Hallmark;
        e.OtherCharges = r.OtherCharges;
        e.Mrp = r.Mrp;
        e.Discount = r.Discount;
        e.GstPercent = r.GstPercent;
        // GST type is chosen for the whole invoice in the app; items follow it.
        e.Igst = r.Igst;
        e.Description = Text(r.Description);
        // A photo link sent back from a list means the photo is unchanged.
        if (!ItemPhoto.IsLink(r.Thumb)) e.Photo = string.IsNullOrEmpty(r.Thumb) ? null : r.Thumb;
        e.Stones.AddRange(r.Stones.Select((s, i) => new PurchaseItemStone
        {
            SortOrder = i, StoneType = s.StoneType.Trim(),
            Pricing = s.Pricing == StonePricing.PerCert ? StonePricing.PerCert : StonePricing.PerCt,
            StoneName = string.IsNullOrWhiteSpace(s.StoneName) ? null : s.StoneName.Trim(),
            Color = string.IsNullOrWhiteSpace(s.Color) ? null : s.Color.Trim(),
            Size = string.IsNullOrWhiteSpace(s.Size) ? null : s.Size.Trim(),
            Pcs = s.Pcs, Weight = s.Weight, Rate = s.Rate,
        }));
        e.Diamonds.AddRange(r.Diamonds.Select((d, i) => new PurchaseItemDiamond
        {
            SortOrder = i, Code = Text(d.Code), DiamondType = Text(d.DiamondType), Size = Text(d.Size), Pcs = d.Pcs,
            Weight = d.Weight, Rate = d.Rate,
        }));
        e.Price = ErpCalculator.CostPerPiece(e);
    }

    /// <summary>SaveChanges, turning a SKU clash between two simultaneous saves into a clear message.</summary>
    private async Task SaveAsync(CancellationToken ct)
    {
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new BusinessValidationException("Another invoice took the same SKU number just now. Please save again.");
        }
    }

    public static PurchaseInvoiceDto ToDto(PurchaseInvoice p) => new(
        p.Id, p.PurchaseDate, p.Branch, p.SupplierName, p.SupplierInvoiceNo, p.SupplierInvoiceDate, p.Remarks, p.Igst,
        p.CreatedAt, p.UpdatedAt,
        p.Items.OrderBy(i => i.SortOrder).Select(i => new PurchaseItemDto(
            i.Id, i.SkuNo, i.Category, i.DesignCode, i.Collection, i.Size, i.DiamondType, i.MetalType, i.Qty,
            i.GrossWeight, i.NetWeight, i.MetalRate, i.LabourRate, i.LabourMinimum, i.Hallmark, i.OtherCharges, i.Price,
            i.Mrp, i.Discount, i.GstPercent, i.Igst, i.Description, ItemPhoto.Url(i),
            i.Stones.OrderBy(s => s.SortOrder).Select(s => new StoneRowDto
            {
                StoneType = s.StoneType, Pricing = s.Pricing, StoneName = s.StoneName, Color = s.Color, Size = s.Size,
                Pcs = s.Pcs,
                Weight = s.Weight, Rate = s.Rate,
            }).ToList(),
            i.Diamonds.OrderBy(d => d.SortOrder).Select(d => new DiamondRowDto
            {
                Code = d.Code, DiamondType = d.DiamondType, Size = d.Size, Pcs = d.Pcs, Weight = d.Weight, Rate = d.Rate,
            }).ToList(), i.LabourFixed)).ToList(),
        p.CreatedBy, p.UpdatedBy);
}

public static class ErpNumbers
{
    /// <summary>Next running number after the highest one with this prefix, e.g. LG-00007 → LG-00008.</summary>
    public static string Next(string prefix, IEnumerable<string> taken)
    {
        var max = taken
            .Where(n => n.StartsWith(prefix, StringComparison.Ordinal))
            .Select(n => int.TryParse(n.AsSpan(prefix.Length), out var v) ? v : 0)
            .DefaultIfEmpty(0)
            .Max();
        return $"{prefix}{max + 1:D5}";
    }
}
