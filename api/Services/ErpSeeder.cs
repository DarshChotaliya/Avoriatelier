using Microsoft.EntityFrameworkCore;
using Purchase.Api.Data;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

/// <summary>Starting master values (from the shared bills); each list is only filled while it is empty.</summary>
public static class ErpSeeder
{
    public static async Task SeedAsync(PurchaseDbContext db, CancellationToken ct = default)
    {
        await Fill(db, ct, () => new[]
        {
            new Supplier { Name = "LURBA LUXURRY PVT LTD", ContactNo = "+912616661111", City = "Surat", State = "Gujarat",
                GstNo = "24AAFFL4607H1ZJ", PanNo = "AAFFL4607H" },
            new Supplier { Name = "SHOORA" },
            new Supplier { Name = "NEEVA" },
        });
        await Fill(db, ct, () => new[] { "Ring", "Earring", "Pendant", "Necklace", "Set", "Bracelet", "Bangle", "Chain",
            "Anklet", "Nose Pin" }.Select(n => new ItemCategory { Name = n }));
        await Fill(db, ct, () => new[] { "Women", "Men", "Heritage", "Bridal", "Kids" }
            .Select(n => new ItemCollection { Name = n }));
        await Fill(db, ct, () => new[] { new Branch { Name = "SURAT" } });
        await Fill(db, ct, () => new[]
        {
            new MetalTypeMaster { Name = "S925", Metal = "Silver", Purity = 92.5m, Rate = 246.98m, WeightFactor = 1m, QuotePercent = 92.5m },
            new MetalTypeMaster { Name = "9KT", Metal = "Gold", Purity = 37.5m, WeightFactor = 1.1m, QuotePercent = 40m },
            new MetalTypeMaster { Name = "14KT", Metal = "Gold", Purity = 58.5m, WeightFactor = 1.25m, QuotePercent = 61.3m },
            new MetalTypeMaster { Name = "18KT", Metal = "Gold", Purity = 75m, WeightFactor = 1.5m, QuotePercent = 78m },
            new MetalTypeMaster { Name = "22KT", Metal = "Gold", Purity = 91.6m, WeightFactor = 1.7m, QuotePercent = 94m },
            new MetalTypeMaster { Name = "24KT", Metal = "Gold", Purity = 99.9m, WeightFactor = 1.85m, QuotePercent = 100m },
        });
        await Fill(db, ct, () => new[]
        {
            new DiamondTypeMaster { Name = "AD", SkuPrefix = "AD-" },
            new DiamondTypeMaster { Name = "Natural", SkuPrefix = "NAT-" },
            new DiamondTypeMaster { Name = "Lab Grown", SkuPrefix = "LG-" },
            new DiamondTypeMaster { Name = "Gem Stone", SkuPrefix = "GEM-" },
        });
        await Fill(db, ct, () => new (string Name, string Pricing, decimal Rate)[]
        {
            ("RND", StonePricing.PerCt, 250), ("OVL", StonePricing.PerCt, 250), ("PEAR", StonePricing.PerCt, 250),
            ("HRT", StonePricing.PerCt, 250), ("EMR", StonePricing.PerCt, 250), ("PRN", StonePricing.PerCt, 250),
            ("SEMI RND", StonePricing.PerCt, 15), ("SEMI OVL", StonePricing.PerCt, 110),
            ("Solitaire (certified)", StonePricing.PerCert, 0),
        }.Select(s => new StoneTypeMaster { Name = s.Name, Pricing = s.Pricing, Rate = s.Rate }));
        await Fill(db, ct, () => new[] { "CZ", "Semi Precious", "Ruby", "Emerald", "Sapphire", "Pearl", "Moissanite" }
            .Select(n => new StoneNameMaster { Name = n }));
        await Fill(db, ct, () => new[] { "Round", "Princess", "Oval", "Cushion", "Emerald", "Pear", "Marquise", "Heart",
            "Radiant", "Asscher" }.Select(n => new DiamondShapeMaster { Name = n }));
    }

    private static async Task Fill<T>(PurchaseDbContext db, CancellationToken ct, Func<IEnumerable<T>> rows)
        where T : MasterEntity
    {
        if (await db.Set<T>().AnyAsync(ct)) return;
        var now = DateTime.UtcNow;
        foreach (var row in rows())
        {
            row.CreatedAt = now;
            row.UpdatedAt = now;
            db.Set<T>().Add(row);
        }
        await db.SaveChangesAsync(ct);
    }
}
