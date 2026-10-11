using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Services;

namespace Purchase.Api.Tests;

public class ProductTagTests
{
    private readonly PurchaseDbContext _db;

    public ProductTagTests()
    {
        var options = new DbContextOptionsBuilder<PurchaseDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new PurchaseDbContext(options);
        ErpSeeder.SeedAsync(_db).GetAwaiter().GetResult();
    }

    [Fact]
    public async Task A_scanned_silver_piece_shows_its_value_in_each_gold_quality_and_nothing_private()
    {
        var owner = new SystemUser("owner");
        var invoice = await new PurchaseInvoiceService(_db, owner).CreateAsync(new PurchaseInvoiceRequest
        {
            PurchaseDate = new DateOnly(2026, 10, 10), Branch = "SURAT", SupplierName = "LURBA LUXURRY PVT LTD",
            Items =
            {
                new PurchaseItemRequest
                {
                    Category = "Ring", DiamondType = "AD", MetalType = "S925", Qty = 1, NetWeight = 10, GrossWeight = 10.5m,
                    MetalRate = 250, GstPercent = 3, Mrp = 9000,
                    Stones = { new StoneRowDto { StoneType = "CZ RND", StoneName = "CZ", Color = "White", Pcs = 12, Weight = 0.36m, Rate = 250 } },
                    Diamonds = { new DiamondRowDto { Code = "Round", DiamondType = "Lab Grown", Size = "1.5", Pcs = 10, Weight = 0.15m, Rate = 40000 } },
                },
            },
        }, default);
        await new MetalRateService(_db, owner).SaveAsync(new MetalRatesRequest { Gold = 14900, Silver = 220 }, default);

        var tag = await new ProductTagService(_db).GetAsync(invoice.Items[0].SkuNo.ToLowerInvariant(), default);

        Assert.NotNull(tag);
        Assert.True(tag!.InStock);
        // 10 g of S925 is about 15 g in 18KT (factor 1.5) × 11,622 = 1,74,330 — like the client's sheet.
        var k18 = tag.MetalPrices.Single(m => m.Quality == "18KT");
        Assert.Equal(15m, k18.Weight);
        Assert.Equal(174330m, k18.MetalValue);
        Assert.Equal(new[] { "S925", "9KT", "14KT", "18KT", "22KT", "24KT" }, tag.MetalPrices.Select(m => m.Quality));
        Assert.Equal(0.15m, tag.DiamondCt);
        Assert.Equal(0.36m, tag.StoneCt);
        Assert.Equal(new[] { "Diamond", "Stone" }, tag.Stones.Select(x => x.Kind));
        Assert.Null(await new ProductTagService(_db).GetAsync("NOPE-1", default));
    }
}
