using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;
using Purchase.Api.Services;

namespace Purchase.Api.Tests;

public class QuotationTests
{
    private readonly PurchaseDbContext _db;

    public QuotationTests()
    {
        var options = new DbContextOptionsBuilder<PurchaseDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new PurchaseDbContext(options);
        ErpSeeder.SeedAsync(_db).GetAwaiter().GetResult();
    }

    // A 10 g silver ring quoted in 18KT gold: 15 g × ₹7,000 + labour ₹800/g + ₹5,000 stones, 3% GST.
    private static QuotationRequest RingIn18Kt(string branch = "SURAT") => new()
    {
        QuotationDate = new DateOnly(2026, 10, 6), Branch = branch, CustomerName = "Kamlesh Dhanwani",
        ContactNo = "7874607111",
        Lines =
        {
            new QuotationLineDto
            {
                SkuNo = "AD-00001", Description = "Ring", FromMetal = "S925", FromWeight = 10, ToMetal = "18KT",
                Weight = 15, MetalRate = 7000, LabourType = LabourType.PerGram, LabourRate = 800, StoneAmount = 5000,
                GstPercent = 3,
            },
        },
    };

    [Fact]
    public void Weight_converts_both_ways_and_labour_can_be_per_gram_or_percent()
    {
        Assert.Equal(15m, QuotationCalculator.ConvertWeight(10, 1m, 1.5m));
        Assert.Equal(10m, QuotationCalculator.ConvertWeight(15, 1.5m, 1m));
        Assert.Equal(11.333m, QuotationCalculator.ConvertWeight(10, 1.5m, 1.7m));

        var line = new QuotationLine { Weight = 15, MetalRate = 7000, LabourType = LabourType.PerGram, LabourRate = 800,
            StoneAmount = 5000, GstPercent = 3, Qty = 1 };
        var c = QuotationCalculator.Line(line);
        Assert.Equal(105000m, c.Metal);
        Assert.Equal(12000m, c.Labour);
        Assert.Equal(122000m, c.Taxable);
        Assert.Equal(3660m, c.Gst);
        Assert.Equal(125660m, c.Total);

        line.LabourType = LabourType.Percent;
        line.LabourRate = 12;
        Assert.Equal(12600m, QuotationCalculator.Line(line).Labour);
    }

    [Fact]
    public async Task Quotations_are_numbered_priced_on_the_server_and_scoped_per_user()
    {
        var staff = new QuotationService(_db, new SystemUser("staff1", new[] { "SURAT" }, Roles.StoreStaff));
        var quote = await staff.CreateAsync(RingIn18Kt(), default);
        Assert.Equal("QT-00001", quote.QuotationNo);
        Assert.Equal(QuotationStatus.Open, quote.Status);
        Assert.Equal(125660m, quote.GrandTotal);

        // Edit: change status and the rate; totals follow.
        var edit = RingIn18Kt();
        edit.Status = QuotationStatus.Accepted;
        edit.Lines[0].MetalRate = 7200;
        var updated = await staff.UpdateAsync(quote.Id, edit, default);
        Assert.Equal(QuotationStatus.Accepted, updated!.Status);
        Assert.Equal(128750m, updated.GrandTotal);
        Assert.Single(await _db.Set<QuotationLine>().ToListAsync());

        // Another staff member does not see it; the owner does.
        var other = new QuotationService(_db, new SystemUser("staff2", new[] { "SURAT" }, Roles.StoreStaff));
        Assert.Empty(await other.GetAllAsync(default));
        Assert.Null(await other.UpdateAsync(quote.Id, edit, default));
        Assert.Single(await new QuotationService(_db, new SystemUser("owner")).GetAllAsync(default));

        // Unknown metal, other branch and empty quotations are refused.
        var bad = RingIn18Kt();
        bad.Lines[0].ToMetal = "30KT";
        await Assert.ThrowsAsync<BusinessValidationException>(() => staff.CreateAsync(bad, default));
        await Assert.ThrowsAsync<BusinessValidationException>(() => staff.CreateAsync(RingIn18Kt("MUMBAI"), default));
        var empty = RingIn18Kt();
        empty.Lines.Clear();
        await Assert.ThrowsAsync<BusinessValidationException>(() => staff.CreateAsync(empty, default));

        Assert.True(await staff.DeleteAsync(quote.Id, default));
        Assert.Empty(await _db.Set<QuotationLine>().ToListAsync());
    }

    [Fact]
    public async Task A_custom_design_needs_no_sku_and_adds_diamonds_cad_once_and_an_advance()
    {
        var staff = new QuotationService(_db, new SystemUser("staff1", new[] { "SURAT" }, Roles.StoreStaff));
        var request = new QuotationRequest
        {
            QuotationDate = new DateOnly(2026, 10, 8), Branch = "SURAT", CustomerName = "Riya", Advance = 20000,
            Lines =
            {
                new QuotationLineDto
                {
                    IsCustom = true, Category = "Ring", Size = "13", Photo = "data:image/jpeg;base64,AAAA",
                    DesignLink = "https://pinterest.com/pin/1", ToMetal = "18KT", Weight = 6, Qty = 2,
                    MetalRate = 11622, LabourType = LabourType.PerGram, LabourRate = 800, DiamondCt = 0.5m,
                    DiamondRate = 40000, CadCharge = 1500, GstPercent = 3,
                },
            },
        };
        var quote = await staff.CreateAsync(request, default);
        var line = quote.Lines.Single();

        // Per piece: metal 69,732 + labour 4,800 + diamond 20,000 = 94,532; × 2 + CAD 1,500 once = 1,90,564.
        Assert.True(line.IsCustom);
        Assert.Equal(string.Empty, line.SkuNo);
        Assert.Equal(20000m, line.DiamondAmount);
        Assert.Equal(190564m, line.Taxable);
        Assert.Equal(196281m, quote.GrandTotal);
        Assert.Equal(176281m, quote.Balance);

        // A design from stock still needs its SKU; a custom one needs a category or description.
        request.Lines[0].IsCustom = false;
        await Assert.ThrowsAsync<BusinessValidationException>(() => staff.CreateAsync(request, default));
        request.Lines[0].IsCustom = true;
        request.Lines[0].Category = null;
        await Assert.ThrowsAsync<BusinessValidationException>(() => staff.CreateAsync(request, default));
    }
}
