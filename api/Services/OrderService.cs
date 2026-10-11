using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public interface IOrderService
{
    Task<List<OrderDto>> GetAllAsync(CancellationToken ct);
    Task<OrderDto> CreateAsync(OrderRequest request, CancellationToken ct);
    Task<OrderDto?> UpdateAsync(int id, OrderRequest request, CancellationToken ct);
    Task<bool> DeleteAsync(int id, CancellationToken ct);
}

/// <summary>
/// Customer orders for made-to-order pieces (the client → manufacturer → CAD → delivery sheet). Nothing is taken from
/// stock. Like sales, users see their own orders unless they have sales.viewAll.
/// </summary>
public class OrderService : IOrderService
{
    private const string Prefix = "ORD-";
    private readonly PurchaseDbContext _db;
    private readonly ICurrentUser _user;

    public OrderService(PurchaseDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    private IQueryable<CustomerOrder> Visible()
    {
        IQueryable<CustomerOrder> orders = _db.CustomerOrders;
        if (_user.AllowedBranches is { } branches) orders = orders.Where(o => branches.Contains(o.Branch));
        if (!_user.Has(Permissions.SalesViewAll))
        {
            var username = _user.Username;
            orders = orders.Where(o => o.CreatedBy == username);
        }
        return orders;
    }

    public async Task<List<OrderDto>> GetAllAsync(CancellationToken ct)
    {
        var orders = await Visible().AsNoTracking()
            .OrderByDescending(o => o.ClientOrderDate).ThenByDescending(o => o.Id)
            .ToListAsync(ct);
        return orders.Select(ToDto).ToList();
    }

    public async Task<OrderDto> CreateAsync(OrderRequest r, CancellationToken ct)
    {
        var branch = await BranchAsync(r, ct);
        Validate(r);
        var now = DateTime.UtcNow;
        var order = new CustomerOrder
        {
            OrderNo = ErpNumbers.Next(Prefix, await _db.CustomerOrders.Select(o => o.OrderNo).ToListAsync(ct)),
            CreatedAt = now,
            CreatedBy = _user.Username,
        };
        Apply(order, r, branch, now);
        _db.CustomerOrders.Add(order);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new BusinessValidationException("Another order took the same number just now. Please save again.");
        }
        return ToDto(order);
    }

    public async Task<OrderDto?> UpdateAsync(int id, OrderRequest r, CancellationToken ct)
    {
        var order = await Visible().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return null;
        var branch = await BranchAsync(r, ct);
        Validate(r);
        Apply(order, r, branch, DateTime.UtcNow);
        await _db.SaveChangesAsync(ct);
        return ToDto(order);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct)
    {
        var order = await Visible().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return false;
        _db.CustomerOrders.Remove(order);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>The order's branch: the one given, else the user's only branch, else the first branch.</summary>
    private async Task<string> BranchAsync(OrderRequest r, CancellationToken ct)
    {
        var branch = r.Branch?.Trim();
        if (string.IsNullOrEmpty(branch))
        {
            branch = _user.AllowedBranches?.FirstOrDefault()
                     ?? await _db.Branches.OrderBy(b => b.Id).Select(b => b.Name).FirstOrDefaultAsync(ct)
                     ?? throw new BusinessValidationException("Add a branch in Masters first.");
        }
        if (!_user.CanUseBranch(branch))
            throw new BusinessValidationException($"You do not have access to branch {branch}.");
        return branch;
    }

    private static void Validate(OrderRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.ClientName)) throw new BusinessValidationException("Client name is required.");
        if (string.IsNullOrWhiteSpace(r.Description)) throw new BusinessValidationException("Description is required.");
        if (!OrderStatus.All.Contains(r.Status))
            throw new BusinessValidationException($"Status must be one of: {string.Join(", ", OrderStatus.All)}.");
        // Dates follow the order flow: client order → placed → CAD; delivery is not before the client order.
        if (r.OrderPlacedDate < r.ClientOrderDate)
            throw new BusinessValidationException("Order placed date is before the client order date.");
        if (r.CadConfirmedDate < r.OrderPlacedDate)
            throw new BusinessValidationException("CAD confirmed date is before the order placed date.");
        if (r.DeliveryDate < r.ClientOrderDate)
            throw new BusinessValidationException("Delivery date is before the client order date.");
    }

    private void Apply(CustomerOrder o, OrderRequest r, string branch, DateTime now)
    {
        string? Text(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
        o.Branch = branch;
        o.ClientName = r.ClientName.Trim();
        o.ContactNo = Text(r.ContactNo);
        o.ClientOrderDate = r.ClientOrderDate;
        o.OrderPlacedDate = r.OrderPlacedDate;
        o.CadConfirmedDate = r.CadConfirmedDate;
        o.DeliveryDate = r.DeliveryDate;
        // Marking an order Delivered stamps today's date as completed when none is given.
        o.CompletedDate = r.CompletedDate
                          ?? (r.Status == OrderStatus.Delivered ? DateOnly.FromDateTime(DateTime.Today) : null);
        o.Description = r.Description.Trim();
        o.DesignRef = Text(r.DesignRef);
        o.MetalType = Text(r.MetalType);
        o.DiamondType = Text(r.DiamondType);
        o.Qty = r.Qty;
        o.Manufacturer = Text(r.Manufacturer);
        o.Status = r.Status;
        o.Notes = Text(r.Notes);
        o.QuotationNo = Text(r.QuotationNo);
        o.Amount = r.Amount;
        o.Advance = r.Advance;
        o.Photo = Text(r.Photo);
        o.UpdatedAt = now;
        o.UpdatedBy = _user.Username;
    }

    private static OrderDto ToDto(CustomerOrder o) => new(
        o.Id, o.OrderNo, o.Branch, o.ClientName, o.ContactNo, o.ClientOrderDate, o.OrderPlacedDate, o.CadConfirmedDate,
        o.DeliveryDate, o.CompletedDate, o.Description, o.DesignRef, o.MetalType, o.DiamondType, o.Qty, o.Manufacturer,
        o.Status, o.Notes, o.QuotationNo, o.Amount, o.Advance, o.Photo, o.CreatedAt, o.CreatedBy);
}
