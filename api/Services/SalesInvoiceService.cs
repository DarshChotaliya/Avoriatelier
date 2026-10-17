using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public interface ISalesInvoiceService
{
    Task<List<SalesInvoiceDto>> GetAllAsync(CancellationToken ct);
    Task<string> GetNextNumberAsync(CancellationToken ct);
    Task<SalesInvoiceDto> CreateAsync(SalesInvoiceRequest request, CancellationToken ct);
    Task<SalesInvoiceDto?> UpdateAsync(int id, SalesInvoiceRequest request, CancellationToken ct);
    Task<bool> DeleteAsync(int id, CancellationToken ct);
}

/// <summary>Sales invoices: selling prices are GST-inclusive; a sale cannot take more pieces than are in stock.</summary>
public class SalesInvoiceService : ISalesInvoiceService
{
    private const string Prefix = "SAL-";
    private const string DeliveredStatus = "DELIVERED";
    private readonly PurchaseDbContext _db;
    private readonly ICurrentUser _user;

    public SalesInvoiceService(PurchaseDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    /// <summary>Sales this user may see: their branches, and only their own sales unless they have sales.viewAll.</summary>
    private IQueryable<SalesInvoice> Visible()
    {
        IQueryable<SalesInvoice> sales = _db.SalesInvoices;
        if (_user.AllowedBranches is { } branches) sales = sales.Where(s => branches.Contains(s.Branch));
        if (!_user.Has(Permissions.SalesViewAll))
        {
            var username = _user.Username;
            sales = sales.Where(s => s.CreatedBy == username);
        }
        return sales;
    }

    public async Task<List<SalesInvoiceDto>> GetAllAsync(CancellationToken ct)
    {
        var sales = await Visible().AsNoTracking().Include(s => s.Lines)
            .OrderByDescending(s => s.InvoiceDate).ThenByDescending(s => s.Id)
            .ToListAsync(ct);
        return sales.Select(ToDto).ToList();
    }

    public async Task<string> GetNextNumberAsync(CancellationToken ct) =>
        ErpNumbers.Next(Prefix, await _db.SalesInvoices.Select(s => s.InvoiceNo).ToListAsync(ct));

    public async Task<SalesInvoiceDto> CreateAsync(SalesInvoiceRequest r, CancellationToken ct)
    {
        Validate(r);
        await CheckOrderAsync(r.OrderNo, null, ct);
        await CheckStockAsync(r.Lines, null, ct);

        string invoiceNo;
        if (!string.IsNullOrWhiteSpace(r.InvoiceNo))
        {
            invoiceNo = r.InvoiceNo.Trim().ToUpperInvariant();
            if (await _db.SalesInvoices.AnyAsync(s => s.InvoiceNo == invoiceNo, ct))
                throw new BusinessValidationException($"Sales invoice {invoiceNo} already exists.");
        }
        else
        {
            invoiceNo = await GetNextNumberAsync(ct);
        }

        var now = DateTime.UtcNow;
        var sale = new SalesInvoice { InvoiceNo = invoiceNo, CreatedAt = now, CreatedBy = _user.Username };
        Apply(sale, r, now);

        _db.SalesInvoices.Add(sale);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new BusinessValidationException("Another sale took the same invoice number just now. Please save again.");
        }
        return ToDto(sale);
    }

    /// <summary>
    /// Changes a sale (its number stays). A delivered sale is closed and cannot be changed. Stock is checked again,
    /// leaving this sale's own pieces out of "already sold".
    /// </summary>
    public async Task<SalesInvoiceDto?> UpdateAsync(int id, SalesInvoiceRequest r, CancellationToken ct)
    {
        var sale = await Visible().Include(s => s.Lines).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sale is null) return null;
        if (sale.OrderStatus == DeliveredStatus)
            throw new BusinessValidationException($"Sales invoice {sale.InvoiceNo} is delivered and cannot be changed.");
        Validate(r);
        await CheckOrderAsync(r.OrderNo, id, ct);
        await CheckStockAsync(r.Lines, id, ct);

        _db.RemoveRange(sale.Lines);
        Apply(sale, r, DateTime.UtcNow);
        await _db.SaveChangesAsync(ct);
        return ToDto(sale);
    }

    /// <summary>A bill made from an order: the order must exist, be delivered, and not be billed already.</summary>
    private async Task CheckOrderAsync(string? orderNo, int? ownId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(orderNo)) return;
        var no = orderNo.Trim().ToUpperInvariant();
        var order = await _db.CustomerOrders.AsNoTracking().FirstOrDefaultAsync(o => o.OrderNo == no, ct)
                    ?? throw new BusinessValidationException($"Order {no} does not exist.");
        if (order.Status != "Delivered")
            throw new BusinessValidationException($"Order {no} is {order.Status}: a sales invoice can be made once it is Delivered.");
        var billed = await _db.SalesInvoices.Where(s => s.OrderNo == no && s.Id != (ownId ?? 0)).Select(s => s.InvoiceNo).FirstOrDefaultAsync(ct);
        if (billed is not null) throw new BusinessValidationException($"Order {no} already has sales invoice {billed}.");
    }

    private void Validate(SalesInvoiceRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Branch)) throw new BusinessValidationException("Branch is required.");
        if (!_user.CanUseBranch(r.Branch))
            throw new BusinessValidationException($"You do not have access to branch {r.Branch}.");
        if (string.IsNullOrWhiteSpace(r.CustomerName)) throw new BusinessValidationException("Customer name is required.");
        if (r.Lines.Count == 0) throw new BusinessValidationException("Add at least one item.");
        if (r.Lines.Any(l => l.Selling <= 0)) throw new BusinessValidationException("Every line needs a selling price.");
        if (r.Lines.Any(l => l.NetWeight <= 0)) throw new BusinessValidationException("Every line needs a net weight.");
    }

    private void Apply(SalesInvoice sale, SalesInvoiceRequest r, DateTime now)
    {
        string? Text(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
        sale.InvoiceDate = r.InvoiceDate;
        sale.Branch = r.Branch.Trim();
        sale.CustomerName = r.CustomerName.Trim();
        sale.ContactNo = Text(r.ContactNo);
        sale.City = Text(r.City);
        sale.State = Text(r.State);
        sale.SalesChannel = r.SalesChannel;
        sale.PaymentMethod = r.PaymentMethod;
        sale.PaymentStatus = r.PaymentStatus;
        sale.OrderStatus = r.OrderStatus;
        sale.CourierPartner = Text(r.CourierPartner);
        sale.TrackingNo = Text(r.TrackingNo);
        sale.Shipping = r.Shipping;
        sale.Expenses = r.Expenses;
        sale.RoundOff = r.RoundOff;
        sale.Notes = Text(r.Notes);
        sale.OrderNo = Text(r.OrderNo)?.ToUpperInvariant();
        sale.BillingAddress = Text(r.BillingAddress);
        sale.ShippingAddress = r.ShippingSameAsBilling ? Text(r.BillingAddress) : Text(r.ShippingAddress);
        sale.ShippingSameAsBilling = r.ShippingSameAsBilling;
        sale.UpdatedAt = now;
        sale.UpdatedBy = _user.Username;
        sale.Lines = r.Lines.Select((l, i) => new SalesInvoiceLine
        {
            SortOrder = i, SkuNo = l.SkuNo.Trim(), Qty = l.Qty, NetWeight = l.NetWeight, Mrp = l.Mrp,
            Discount = l.Discount, Selling = l.Selling, GstPercent = l.GstPercent, Igst = l.Igst,
            Description = Text(l.Description), HsnSac = Text(l.HsnSac), MetalType = Text(l.MetalType),
            GrossWeight = l.GrossWeight, MetalAmount = l.MetalAmount, DiaPcs = l.DiaPcs, DiaWeight = l.DiaWeight,
            DiaAmount = l.DiaAmount, StonePcs = l.StonePcs, StoneWeight = l.StoneWeight,
            StoneAmount = l.StoneAmount, MakingCharges = l.MakingCharges,
        }).ToList();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var sale = await Visible().Include(s => s.Lines).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sale is null) return false;
        _db.SalesInvoices.Remove(sale);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Available = purchased qty − already sold qty; the same SKU on two lines counts once. When a sale is being
    /// changed, its own lines are left out of "already sold".
    /// </summary>
    private async Task CheckStockAsync(List<SalesLineDto> lines, int? exceptSaleId, CancellationToken ct)
    {
        var wanted = lines.GroupBy(l => l.SkuNo.Trim()).ToDictionary(g => g.Key, g => g.Sum(l => l.Qty));
        var skus = wanted.Keys.ToList();
        // Only stock bought for the branches this user works in can be sold by them.
        var items = _db.PurchaseInvoiceItems.Where(i => skus.Contains(i.SkuNo));
        if (_user.AllowedBranches is { } branches) items = items.Where(i => branches.Contains(i.PurchaseInvoice!.Branch));
        var purchased = await items.ToDictionaryAsync(i => i.SkuNo, i => i.Qty, ct);
        var sold = await _db.SalesInvoiceLines
            .Where(l => skus.Contains(l.SkuNo) && (exceptSaleId == null || l.SalesInvoiceId != exceptSaleId))
            .GroupBy(l => l.SkuNo).Select(g => new { g.Key, Qty = g.Sum(l => l.Qty) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty, ct);

        foreach (var (sku, qty) in wanted)
        {
            if (!purchased.TryGetValue(sku, out var bought))
                throw new BusinessValidationException($"SKU {sku} was not found. Add it through a purchase invoice first.");
            var available = bought - sold.GetValueOrDefault(sku);
            if (qty > available)
                throw new BusinessValidationException($"Not enough stock for {sku}: {available} available, {qty} on this sale.");
        }
    }

    private static SalesInvoiceDto ToDto(SalesInvoice s) => new(
        s.Id, s.InvoiceNo, s.InvoiceDate, s.Branch, s.CustomerName, s.ContactNo, s.City, s.State, s.SalesChannel,
        s.PaymentMethod, s.PaymentStatus, s.OrderStatus, s.CourierPartner, s.TrackingNo, s.Shipping, s.Expenses, s.Notes,
        s.BillingAddress, s.ShippingAddress, s.ShippingSameAsBilling, s.CreatedAt,
        s.Lines.OrderBy(l => l.SortOrder).Select(l => new SalesLineDto
        {
            SkuNo = l.SkuNo, Qty = l.Qty, NetWeight = l.NetWeight, Mrp = l.Mrp, Discount = l.Discount,
            Selling = l.Selling, GstPercent = l.GstPercent, Igst = l.Igst,
            Description = l.Description, HsnSac = l.HsnSac, MetalType = l.MetalType, GrossWeight = l.GrossWeight,
            MetalAmount = l.MetalAmount, DiaPcs = l.DiaPcs, DiaWeight = l.DiaWeight, DiaAmount = l.DiaAmount,
            StonePcs = l.StonePcs, StoneWeight = l.StoneWeight, StoneAmount = l.StoneAmount,
            MakingCharges = l.MakingCharges,
        }).ToList(),
        s.CreatedBy, s.RoundOff, s.OrderNo);
}
