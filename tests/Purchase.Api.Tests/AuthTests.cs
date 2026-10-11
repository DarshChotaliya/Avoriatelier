using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;
using Purchase.Api.Services;

namespace Purchase.Api.Tests;

public class AuthTests
{
    private readonly PurchaseDbContext _db;
    private readonly UserService _users;

    public AuthTests()
    {
        var options = new DbContextOptionsBuilder<PurchaseDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new PurchaseDbContext(options);
        ErpSeeder.SeedAsync(_db).GetAwaiter().GetResult();
        _users = new UserService(_db, new PasswordHasher<AppUser>());
    }

    private Task<AppUser> Owner() =>
        _users.SetupOwnerAsync(new SetupRequest { Username = "Darsh", FullName = "Darsh C", Password = "Avori2026" }, default);

    [Fact]
    public void Roles_grant_the_agreed_permissions()
    {
        Assert.True(Roles.Has(Roles.Owner, Permissions.UsersManage));
        Assert.False(Roles.Has(Roles.Manager, Permissions.UsersManage));
        Assert.False(Roles.Has(Roles.Manager, Permissions.PurchaseDelete));
        Assert.True(Roles.Has(Roles.Accountant, Permissions.CostView));
        Assert.False(Roles.Has(Roles.Accountant, Permissions.SalesCreate));
        Assert.True(Roles.Has(Roles.StoreStaff, Permissions.SalesCreate));
        Assert.False(Roles.Has(Roles.StoreStaff, Permissions.CostView));
        Assert.False(Roles.Has(Roles.StoreStaff, Permissions.PurchaseView));
        Assert.False(Roles.Has("Hacker", Permissions.SalesView));
    }

    [Fact]
    public async Task Setup_creates_one_owner_only_and_hashes_the_password()
    {
        var owner = await Owner();
        Assert.Equal("darsh", owner.Username);
        Assert.Equal(Roles.Owner, owner.Role);
        Assert.DoesNotContain("Avori2026", owner.PasswordHash);
        await Assert.ThrowsAsync<BusinessValidationException>(() => Owner());
    }

    [Fact]
    public async Task Login_checks_the_password_and_locks_after_five_wrong_tries()
    {
        await Owner();
        Assert.Equal("darsh", (await _users.LoginAsync(" DARSH ", "Avori2026", default)).Username);

        for (var i = 0; i < UserService.MaxFailedLogins; i++)
        {
            var ex = await Assert.ThrowsAsync<BusinessValidationException>(
                () => _users.LoginAsync("darsh", "wrong-pass1", default));
            Assert.Equal("Wrong username or password.", ex.Message);
        }
        var locked = await Assert.ThrowsAsync<BusinessValidationException>(
            () => _users.LoginAsync("darsh", "Avori2026", default));
        Assert.Contains("Too many wrong passwords", locked.Message);

        // Unknown users get the same message as a wrong password.
        var unknown = await Assert.ThrowsAsync<BusinessValidationException>(
            () => _users.LoginAsync("nobody", "Avori2026", default));
        Assert.Equal("Wrong username or password.", unknown.Message);
    }

    [Fact]
    public async Task Weak_passwords_duplicate_names_and_losing_the_last_owner_are_refused()
    {
        var owner = await Owner();
        await Assert.ThrowsAsync<BusinessValidationException>(() => _users.SaveAsync(
            new UserSaveRequest { Username = "staff1", FullName = "Staff", Role = Roles.StoreStaff, Password = "short" },
            owner.Id, default));
        await Assert.ThrowsAsync<BusinessValidationException>(() => _users.SaveAsync(
            new UserSaveRequest { Username = "DARSH", FullName = "X", Role = Roles.StoreStaff, Password = "Strong123" },
            owner.Id, default));
        await Assert.ThrowsAsync<BusinessValidationException>(() => _users.SaveAsync(
            new UserSaveRequest { Id = owner.Id, Username = "darsh", FullName = "D", Role = Roles.Manager },
            owner.Id, default));
    }

    [Fact]
    public async Task Changing_role_or_branches_signs_the_user_out()
    {
        var owner = await Owner();
        var staff = await _users.SaveAsync(new UserSaveRequest
        {
            Username = "staff1", FullName = "Staff", Role = Roles.StoreStaff, Branches = { "SURAT" }, Password = "Strong123",
        }, owner.Id, default);
        var before = (await _db.Users.AsNoTracking().SingleAsync(u => u.Id == staff.Id)).SecurityStamp;

        await _users.SaveAsync(new UserSaveRequest
        {
            Id = staff.Id, Username = "staff1", FullName = "Staff", Role = Roles.Manager, Branches = { "SURAT" },
        }, owner.Id, default);
        Assert.NotEqual(before, (await _db.Users.AsNoTracking().SingleAsync(u => u.Id == staff.Id)).SecurityStamp);

        // Renaming their branch in Masters moves the user to the new name and signs them out.
        before = (await _db.Users.AsNoTracking().SingleAsync(u => u.Id == staff.Id)).SecurityStamp;
        var surat = await _db.Branches.SingleAsync(b => b.Name == "SURAT");
        await new MasterService(_db).SaveAsync("branches",
            System.Text.Json.JsonSerializer.SerializeToElement(new { id = surat.Id, name = "SURAT MAIN" }), default);
        var renamed = await _db.Users.AsNoTracking().SingleAsync(u => u.Id == staff.Id);
        Assert.Equal("SURAT MAIN", renamed.Branches);
        Assert.NotEqual(before, renamed.SecurityStamp);
    }

    [Fact]
    public async Task Branch_users_only_see_and_sell_their_branch_stock()
    {
        _db.Branches.Add(new Branch { Name = "MUMBAI" });
        await _db.SaveChangesAsync();
        var owner = new PurchaseInvoiceService(_db, new SystemUser("owner"));
        PurchaseInvoiceRequest Invoice(string branch) => new()
        {
            PurchaseDate = new DateOnly(2026, 10, 6), Branch = branch, SupplierName = "LURBA LUXURRY PVT LTD",
            Items = { new PurchaseItemRequest { Category = "Ring", DiamondType = "AD", MetalType = "S925", Qty = 1, NetWeight = 1 } },
        };
        var surat = await owner.CreateAsync(Invoice("SURAT"), default);
        var mumbai = await owner.CreateAsync(Invoice("MUMBAI"), default);

        var suratStaff = new SystemUser("staff1", new[] { "SURAT" }, Roles.StoreStaff);
        var staffPurchases = new PurchaseInvoiceService(_db, suratStaff);
        Assert.Single(await staffPurchases.GetAllAsync(default));
        await Assert.ThrowsAsync<BusinessValidationException>(() => staffPurchases.CreateAsync(Invoice("MUMBAI"), default));

        var stock = await new StockService(_db, suratStaff).GetAsync(default);
        var row = Assert.Single(stock);
        Assert.Equal(surat.Items[0].SkuNo, row.SkuNo);
        Assert.Null(row.CostPerPiece);
        Assert.Null(row.SupplierName);

        var sales = new SalesInvoiceService(_db, suratStaff);
        SalesInvoiceRequest Sale(string sku, string branch) => new()
        {
            InvoiceDate = new DateOnly(2026, 10, 6), Branch = branch, CustomerName = "Riya",
            Lines = { new SalesLineDto { SkuNo = sku, Qty = 1, NetWeight = 1, Selling = 100 } },
        };
        await Assert.ThrowsAsync<BusinessValidationException>(() => sales.CreateAsync(Sale(mumbai.Items[0].SkuNo, "SURAT"), default));
        await Assert.ThrowsAsync<BusinessValidationException>(() => sales.CreateAsync(Sale(surat.Items[0].SkuNo, "MUMBAI"), default));
        var sale = await sales.CreateAsync(Sale(surat.Items[0].SkuNo, "SURAT"), default);
        Assert.Equal("staff1", sale.CreatedBy);

        // User-wise sales: another staff member does not see staff1's sale; the owner sees all.
        var otherStaff = new SalesInvoiceService(_db, new SystemUser("staff2", new[] { "SURAT" }, Roles.StoreStaff));
        Assert.Empty(await otherStaff.GetAllAsync(default));
        Assert.False(await otherStaff.DeleteAsync(sale.Id, default));
        Assert.Single(await sales.GetAllAsync(default));
        Assert.Single(await new SalesInvoiceService(_db, new SystemUser("owner")).GetAllAsync(default));

        var ownerStock = await new StockService(_db, new SystemUser("owner")).GetAsync(default);
        Assert.Equal(2, ownerStock.Count);
        Assert.NotNull(ownerStock[0].CostPerPiece);
    }
}
