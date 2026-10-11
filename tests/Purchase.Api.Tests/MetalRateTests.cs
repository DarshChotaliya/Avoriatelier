using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Entities;
using Purchase.Api.Services;

namespace Purchase.Api.Tests;

public class MetalRateTests
{
    private readonly PurchaseDbContext _db;

    public MetalRateTests()
    {
        var options = new DbContextOptionsBuilder<PurchaseDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new PurchaseDbContext(options);
        ErpSeeder.SeedAsync(_db).GetAwaiter().GetResult();
    }

    private decimal QuoteRate(string name) => _db.MetalTypes.AsNoTracking().Single(m => m.Name == name).QuoteRate;

    [Fact]
    public async Task Todays_999_rate_sets_every_quality_quotation_rate_like_the_client_sheet()
    {
        var rates = new MetalRateService(_db, new SystemUser("owner"));
        await rates.SaveAsync(new MetalRatesRequest { Gold = 14900, Silver = 220, Platinum = 3200 }, default);

        // METAL CALCULATION.xlsx: 9K 40%, 14K 61.3%, 18K 78%, 22K 94% of gold 999.
        Assert.Equal(5960m, QuoteRate("9KT"));
        Assert.Equal(9133.70m, QuoteRate("14KT"));
        Assert.Equal(11622m, QuoteRate("18KT"));
        Assert.Equal(14006m, QuoteRate("22KT"));
        Assert.Equal(203.50m, QuoteRate("S925"));
        Assert.Equal(14900m, (await rates.GetAsync(default)).Single(r => r.Metal == "Gold").Rate);
        Assert.Equal(3200m, (await rates.GetAsync(default)).Single(r => r.Metal == "Platinum").Rate);

        // Changing a quality's Quotation % in Masters uses today's rate at once.
        var k18 = await _db.MetalTypes.AsNoTracking().SingleAsync(m => m.Name == "18KT");
        await new MasterService(_db).SaveAsync("metalTypes", JsonSerializer.SerializeToElement(new
        {
            id = k18.Id, name = "18KT", metal = "Gold", purity = 75, weightFactor = 1.5, quotePercent = 80,
        }), default);
        Assert.Equal(11920m, QuoteRate("18KT"));
    }
}
