using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;
using Purchase.Api.Services;

namespace Purchase.Api.Tests;

public class OrderTests
{
    private readonly PurchaseDbContext _db;

    public OrderTests()
    {
        var options = new DbContextOptionsBuilder<PurchaseDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new PurchaseDbContext(options);
        ErpSeeder.SeedAsync(_db).GetAwaiter().GetResult();
    }

    // Row 2 of the order sheet: Kamlesh Dhanwani's CQ SET in 18KT lab-grown, made by Neeva.
    private static OrderRequest CqSet() => new()
    {
        ClientName = "KAMLESH DHANWANI", ContactNo = "7874607111", ClientOrderDate = new DateOnly(2026, 7, 27),
        OrderPlacedDate = new DateOnly(2026, 7, 28), CadConfirmedDate = new DateOnly(2026, 7, 30),
        DeliveryDate = new DateOnly(2026, 8, 12), Description = "CQ SET", DesignRef = "CQ390", MetalType = "18KT",
        DiamondType = "Lab Grown", Qty = 1, Manufacturer = "LURBA LUXURRY PVT LTD", Status = "Ready",
    };

    [Fact]
    public async Task Orders_follow_the_sheet_and_delivered_stamps_the_completed_date()
    {
        var staff = new OrderService(_db, new SystemUser("staff1", new[] { "SURAT" }, Roles.StoreStaff));
        var order = await staff.CreateAsync(CqSet(), default);
        Assert.Equal("ORD-00001", order.OrderNo);
        Assert.Equal("SURAT", order.Branch);
        Assert.Null(order.CompletedDate);

        var delivered = CqSet();
        delivered.Status = OrderStatus.Delivered;
        delivered.CompletedDate = new DateOnly(2026, 8, 16);
        Assert.Equal(new DateOnly(2026, 8, 16), (await staff.UpdateAsync(order.Id, delivered, default))!.CompletedDate);

        // Other staff do not see it; the owner does.
        var other = new OrderService(_db, new SystemUser("staff2", new[] { "SURAT" }, Roles.StoreStaff));
        Assert.Empty(await other.GetAllAsync(default));
        Assert.False(await other.DeleteAsync(order.Id, default));
        Assert.Single(await new OrderService(_db, new SystemUser("owner")).GetAllAsync(default));

        // Dates out of order and unknown statuses are refused.
        var early = CqSet();
        early.CadConfirmedDate = new DateOnly(2026, 7, 1);
        await Assert.ThrowsAsync<BusinessValidationException>(() => staff.CreateAsync(early, default));
        var odd = CqSet();
        odd.Status = "Lost";
        await Assert.ThrowsAsync<BusinessValidationException>(() => staff.CreateAsync(odd, default));
    }

    [Fact]
    public async Task Masters_used_by_an_order_are_protected_and_renamed_into_it()
    {
        await new OrderService(_db, new SystemUser("owner")).CreateAsync(CqSet(), default);
        var masters = new MasterService(_db);
        var supplier = await _db.Suppliers.SingleAsync(s => s.Name == "LURBA LUXURRY PVT LTD");
        await Assert.ThrowsAsync<BusinessValidationException>(() => masters.DeleteAsync("suppliers", supplier.Id, default));

        await masters.SaveAsync("suppliers", JsonSerializer.SerializeToElement(new { id = supplier.Id, name = "LURBA" }), default);
        Assert.Equal("LURBA", (await _db.CustomerOrders.SingleAsync()).Manufacturer);
    }
}
