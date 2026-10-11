using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Data;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public interface IMasterService
{
    Task<Dictionary<string, object>> GetAllAsync(CancellationToken ct);
    Task<object> SaveAsync(string kind, JsonElement body, CancellationToken ct);
    Task<bool> DeleteAsync(string kind, int id, CancellationToken ct);
}

/// <summary>
/// All master lists behind one API. Kinds match the React app's keys (customers, suppliers, categories, …).
/// Names are unique (case-insensitive). Renaming a master also renames it in every invoice that uses it;
/// a name that invoices still use cannot be deleted.
/// </summary>
public class MasterService : IMasterService
{
    public static readonly string[] Kinds =
    {
        "customers", "suppliers", "categories", "collections", "branches", "metalTypes", "diamondTypes", "stoneTypes",
        "stoneNames", "diamondShapes",
    };

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly PurchaseDbContext _db;

    public MasterService(PurchaseDbContext db)
    {
        _db = db;
    }

    public async Task<Dictionary<string, object>> GetAllAsync(CancellationToken ct) => new()
    {
        ["customers"] = await List<Customer>(ct),
        ["suppliers"] = await List<Supplier>(ct),
        ["categories"] = await List<ItemCategory>(ct),
        ["collections"] = await List<ItemCollection>(ct),
        ["branches"] = await List<Branch>(ct),
        ["metalTypes"] = await List<MetalTypeMaster>(ct),
        ["diamondTypes"] = await List<DiamondTypeMaster>(ct),
        ["stoneTypes"] = await List<StoneTypeMaster>(ct),
        ["stoneNames"] = await List<StoneNameMaster>(ct),
        ["diamondShapes"] = await List<DiamondShapeMaster>(ct),
    };

    public Task<object> SaveAsync(string kind, JsonElement body, CancellationToken ct) => kind switch
    {
        "customers" => Save<Customer>(kind, body, ct),
        "suppliers" => Save<Supplier>(kind, body, ct),
        "categories" => Save<ItemCategory>(kind, body, ct),
        "collections" => Save<ItemCollection>(kind, body, ct),
        "branches" => Save<Branch>(kind, body, ct),
        "metalTypes" => Save<MetalTypeMaster>(kind, body, ct),
        "diamondTypes" => Save<DiamondTypeMaster>(kind, body, ct),
        "stoneTypes" => Save<StoneTypeMaster>(kind, body, ct),
        "stoneNames" => Save<StoneNameMaster>(kind, body, ct),
        "diamondShapes" => Save<DiamondShapeMaster>(kind, body, ct),
        _ => throw new BusinessValidationException($"Unknown master '{kind}'."),
    };

    public Task<bool> DeleteAsync(string kind, int id, CancellationToken ct) => kind switch
    {
        "customers" => Delete<Customer>(kind, id, ct),
        "suppliers" => Delete<Supplier>(kind, id, ct),
        "categories" => Delete<ItemCategory>(kind, id, ct),
        "collections" => Delete<ItemCollection>(kind, id, ct),
        "branches" => Delete<Branch>(kind, id, ct),
        "metalTypes" => Delete<MetalTypeMaster>(kind, id, ct),
        "diamondTypes" => Delete<DiamondTypeMaster>(kind, id, ct),
        "stoneTypes" => Delete<StoneTypeMaster>(kind, id, ct),
        "stoneNames" => Delete<StoneNameMaster>(kind, id, ct),
        "diamondShapes" => Delete<DiamondShapeMaster>(kind, id, ct),
        _ => throw new BusinessValidationException($"Unknown master '{kind}'."),
    };

    private async Task<object> List<T>(CancellationToken ct) where T : MasterEntity =>
        await _db.Set<T>().AsNoTracking().OrderBy(x => x.Id).ToListAsync(ct);

    private async Task<object> Save<T>(string kind, JsonElement body, CancellationToken ct) where T : MasterEntity
    {
        var incoming = body.Deserialize<T>(Json) ?? throw new BusinessValidationException("Empty record.");
        incoming.Name = incoming.Name?.Trim() ?? string.Empty;
        Validate(incoming);
        if (incoming is MetalTypeMaster metal)
            MetalRateService.ApplyQuoteRate(metal, await MetalRateService.BasesAsync(_db, ct));

        var set = _db.Set<T>();
        var lower = incoming.Name.ToLower();
        if (await set.AnyAsync(x => x.Id != incoming.Id && x.Name.ToLower() == lower, ct))
            throw new BusinessValidationException($"\"{incoming.Name}\" already exists.");

        var now = DateTime.UtcNow;
        if (incoming.Id == 0)
        {
            incoming.CreatedAt = now;
            incoming.UpdatedAt = now;
            set.Add(incoming);
            await _db.SaveChangesAsync(ct);
            return incoming;
        }

        var existing = await set.FirstOrDefaultAsync(x => x.Id == incoming.Id, ct)
                       ?? throw new BusinessValidationException("This record no longer exists.");
        if (existing.Name != incoming.Name) await RenameInUseAsync(kind, existing.Name, incoming.Name, ct);

        incoming.CreatedAt = existing.CreatedAt;
        incoming.UpdatedAt = now;
        _db.Entry(existing).CurrentValues.SetValues(incoming);
        await _db.SaveChangesAsync(ct);
        return existing;
    }

    private async Task<bool> Delete<T>(string kind, int id, CancellationToken ct) where T : MasterEntity
    {
        var existing = await _db.Set<T>().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (existing is null) return false;
        if (await IsInUseAsync(kind, existing.Name, ct))
            throw new BusinessValidationException($"\"{existing.Name}\" is used in invoices and cannot be deleted.");
        _db.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private static void Validate(MasterEntity m)
    {
        if (string.IsNullOrWhiteSpace(m.Name)) throw new BusinessValidationException("Name is required.");
        if (m.Name.Length > 200) throw new BusinessValidationException("Name is too long (max 200).");
        switch (m)
        {
            case ItemCategory c:
                c.ShortCode = new string((c.ShortCode ?? string.Empty).Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
                if (c.ShortCode.Length > 6) throw new BusinessValidationException("Short code is too long (max 6).");
                break;
            case DiamondTypeMaster d:
                // No longer used or shown (SKUs follow the SKU settings); kept so old records still save.
                d.SkuPrefix = d.SkuPrefix?.Trim().ToUpperInvariant() ?? string.Empty;
                if (d.SkuPrefix.Length > 10) d.SkuPrefix = d.SkuPrefix[..10];
                break;
            case StoneTypeMaster s when s.Pricing is not (StonePricing.PerCt or StonePricing.PerCert):
                throw new BusinessValidationException("Pricing must be per Ct or per Cert.");
            case MetalTypeMaster mt when string.IsNullOrWhiteSpace(mt.Metal):
                throw new BusinessValidationException("Metal is required.");
            case MetalTypeMaster mt when mt.QuotePercent is < 0 or > 100:
                throw new BusinessValidationException("Quotation % must be between 0 and 100.");
            case MetalTypeMaster mt when mt.WeightFactor is < 0 or > 10:
                throw new BusinessValidationException("Weight factor must be between 0 and 10 (S925 silver = 1).");
            case MetalTypeMaster mt when mt.WeightFactor == 0:
                mt.WeightFactor = 1m;
                break;
        }
    }

    /// <summary>Whether invoices still refer to this master name.</summary>
    private Task<bool> IsInUseAsync(string kind, string name, CancellationToken ct) => kind switch
    {
        "customers" => AnyAsync(
            () => _db.SalesInvoices.AnyAsync(s => s.CustomerName == name, ct),
            () => _db.Quotations.AnyAsync(q => q.CustomerName == name, ct),
            () => _db.CustomerOrders.AnyAsync(o => o.ClientName == name, ct)),
        "suppliers" => AnyAsync(
            () => _db.PurchaseInvoices.AnyAsync(p => p.SupplierName == name, ct),
            () => _db.CustomerOrders.AnyAsync(o => o.Manufacturer == name, ct)),
        "categories" => _db.PurchaseInvoiceItems.AnyAsync(i => i.Category == name, ct),
        "collections" => _db.PurchaseInvoiceItems.AnyAsync(i => i.Collection == name, ct),
        "branches" => BranchInUse(name, ct),
        "metalTypes" => AnyAsync(
            () => _db.PurchaseInvoiceItems.AnyAsync(i => i.MetalType == name, ct),
            () => _db.Set<QuotationLine>().AnyAsync(l => l.FromMetal == name || l.ToMetal == name, ct),
            () => _db.CustomerOrders.AnyAsync(o => o.MetalType == name, ct)),
        "diamondTypes" => AnyAsync(
            () => _db.PurchaseInvoiceItems.AnyAsync(i => i.DiamondType == name, ct),
            () => _db.CustomerOrders.AnyAsync(o => o.DiamondType == name, ct)),
        "stoneTypes" => _db.Set<PurchaseItemStone>().AnyAsync(s => s.StoneType == name, ct),
        "stoneNames" => _db.Set<PurchaseItemStone>().AnyAsync(s => s.StoneName == name, ct),
        "diamondShapes" => _db.Set<PurchaseItemDiamond>().AnyAsync(d => d.Code == name, ct),
        _ => Task.FromResult(false),
    };

    /// <summary>
    /// Invoices refer to masters by name, so a rename is carried into every invoice (and, for a branch, every
    /// user limited to it) in the same save. Users whose branch changed are signed out to pick up the new name.
    /// </summary>
    private async Task RenameInUseAsync(string kind, string oldName, string newName, CancellationToken ct)
    {
        switch (kind)
        {
            case "customers":
                foreach (var s in await _db.SalesInvoices.Where(s => s.CustomerName == oldName).ToListAsync(ct))
                    s.CustomerName = newName;
                foreach (var q in await _db.Quotations.Where(q => q.CustomerName == oldName).ToListAsync(ct))
                    q.CustomerName = newName;
                foreach (var o in await _db.CustomerOrders.Where(o => o.ClientName == oldName).ToListAsync(ct))
                    o.ClientName = newName;
                break;
            case "suppliers":
                foreach (var p in await _db.PurchaseInvoices.Where(p => p.SupplierName == oldName).ToListAsync(ct))
                    p.SupplierName = newName;
                foreach (var o in await _db.CustomerOrders.Where(o => o.Manufacturer == oldName).ToListAsync(ct))
                    o.Manufacturer = newName;
                break;
            case "categories":
                foreach (var i in await _db.PurchaseInvoiceItems.Where(i => i.Category == oldName).ToListAsync(ct))
                    i.Category = newName;
                break;
            case "collections":
                foreach (var i in await _db.PurchaseInvoiceItems.Where(i => i.Collection == oldName).ToListAsync(ct))
                    i.Collection = newName;
                break;
            case "metalTypes":
                foreach (var i in await _db.PurchaseInvoiceItems.Where(i => i.MetalType == oldName).ToListAsync(ct))
                    i.MetalType = newName;
                foreach (var l in await _db.Set<QuotationLine>().Where(l => l.FromMetal == oldName).ToListAsync(ct))
                    l.FromMetal = newName;
                foreach (var l in await _db.Set<QuotationLine>().Where(l => l.ToMetal == oldName).ToListAsync(ct))
                    l.ToMetal = newName;
                foreach (var o in await _db.CustomerOrders.Where(o => o.MetalType == oldName).ToListAsync(ct))
                    o.MetalType = newName;
                break;
            case "diamondTypes":
                foreach (var i in await _db.PurchaseInvoiceItems.Where(i => i.DiamondType == oldName).ToListAsync(ct))
                    i.DiamondType = newName;
                foreach (var o in await _db.CustomerOrders.Where(o => o.DiamondType == oldName).ToListAsync(ct))
                    o.DiamondType = newName;
                break;
            case "stoneTypes":
                foreach (var st in await _db.Set<PurchaseItemStone>().Where(st => st.StoneType == oldName).ToListAsync(ct))
                    st.StoneType = newName;
                break;
            case "stoneNames":
                foreach (var st in await _db.Set<PurchaseItemStone>().Where(st => st.StoneName == oldName).ToListAsync(ct))
                    st.StoneName = newName;
                break;
            case "diamondShapes":
                foreach (var d in await _db.Set<PurchaseItemDiamond>().Where(d => d.Code == oldName).ToListAsync(ct))
                    d.Code = newName;
                break;
            case "branches":
                foreach (var p in await _db.PurchaseInvoices.Where(p => p.Branch == oldName).ToListAsync(ct))
                    p.Branch = newName;
                foreach (var s in await _db.SalesInvoices.Where(s => s.Branch == oldName).ToListAsync(ct))
                    s.Branch = newName;
                foreach (var q in await _db.Quotations.Where(q => q.Branch == oldName).ToListAsync(ct))
                    q.Branch = newName;
                foreach (var o in await _db.CustomerOrders.Where(o => o.Branch == oldName).ToListAsync(ct))
                    o.Branch = newName;
                foreach (var u in await _db.Users.Where(u => u.Branches != null && u.Branches != "").ToListAsync(ct))
                {
                    var branches = u.BranchList();
                    if (!branches.Contains(oldName)) continue;
                    u.Branches = string.Join(",", branches.Select(b => b == oldName ? newName : b));
                    u.SecurityStamp = Guid.NewGuid();
                }
                break;
        }
    }

    private Task<bool> BranchInUse(string name, CancellationToken ct) => AnyAsync(
        () => _db.PurchaseInvoices.AnyAsync(p => p.Branch == name, ct),
        () => _db.SalesInvoices.AnyAsync(s => s.Branch == name, ct),
        () => _db.Quotations.AnyAsync(q => q.Branch == name, ct),
        () => _db.CustomerOrders.AnyAsync(o => o.Branch == name, ct));

    /// <summary>True when any check is true. Checks run one after another (a DbContext allows one query at a time).</summary>
    private static async Task<bool> AnyAsync(params Func<Task<bool>>[] checks)
    {
        foreach (var check in checks)
            if (await check()) return true;
        return false;
    }
}
