using Microsoft.EntityFrameworkCore;
using Purchase.Api.Entities;

namespace Purchase.Api.Data;

public class PurchaseDbContext : DbContext
{
    public PurchaseDbContext(DbContextOptions<PurchaseDbContext> options) : base(options)
    {
    }

    public DbSet<PurchaseHeader> Purchases => Set<PurchaseHeader>();
    public DbSet<DiamondItem> DiamondItems => Set<DiamondItem>();
    public DbSet<GoldItem> GoldItems => Set<GoldItem>();
    public DbSet<SilverItem> SilverItems => Set<SilverItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PurchaseHeader>(e =>
        {
            e.ToTable("purchase");
            e.Property(p => p.PurchaseNo).HasMaxLength(30).IsRequired();
            e.HasIndex(p => p.PurchaseNo).IsUnique();
            e.HasIndex(p => p.PurchaseDate);
            e.Property(p => p.SupplierName).HasMaxLength(200).IsRequired();
            e.Property(p => p.InvoiceNo).HasMaxLength(50);
            e.Property(p => p.PurchaseType).HasConversion<string>().HasMaxLength(10);
            e.Property(p => p.PaymentType).HasMaxLength(30).IsRequired();
            e.Property(p => p.Remarks).HasMaxLength(500);

            foreach (var name in new[] { "GrossAmount", "Discount", "TaxableAmount", "CgstAmount", "SgstAmount",
                         "IgstAmount", "RoundOff", "NetPurchaseAmount" })
                e.Property(name).HasPrecision(18, 2);
            foreach (var name in new[] { "CgstPercent", "SgstPercent", "IgstPercent" })
                e.Property(name).HasPrecision(5, 2);

            e.HasMany(p => p.DiamondItems).WithOne(i => i.Purchase!).HasForeignKey(i => i.PurchaseId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(p => p.GoldItems).WithOne(i => i.Purchase!).HasForeignKey(i => i.PurchaseId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(p => p.SilverItems).WithOne(i => i.Purchase!).HasForeignKey(i => i.PurchaseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DiamondItem>(e =>
        {
            e.ToTable("purchase_diamond_item");
            e.Property(i => i.Carat).HasPrecision(12, 3);
            e.Property(i => i.RatePerCarat).HasPrecision(18, 2);
            e.Property(i => i.DiscountPercent).HasPrecision(5, 2);
            e.Property(i => i.Amount).HasPrecision(18, 2);
            foreach (var name in new[] { "PacketLotNo", "Shape", "Color", "Clarity", "Cut", "Polish", "Symmetry",
                         "Fluorescence", "CertificateNo" })
                e.Property(name).HasMaxLength(50);
        });

        modelBuilder.Entity<GoldItem>(e =>
        {
            e.ToTable("purchase_gold_item");
            e.Property(i => i.GoldType).HasMaxLength(50);
            e.Property(i => i.Purity).HasMaxLength(10).IsRequired();
            foreach (var name in new[] { "GrossWeight", "StoneWeight", "NetWeight", "WastageWeight", "ChargeableWeight" })
                e.Property(name).HasPrecision(12, 3);
            e.Property(i => i.WastagePercent).HasPrecision(5, 2);
            foreach (var name in new[] { "RatePerGram", "GoldValue", "MakingCharges", "OtherCharges", "Amount" })
                e.Property(name).HasPrecision(18, 2);
        });

        modelBuilder.Entity<SilverItem>(e =>
        {
            e.ToTable("purchase_silver_item");
            e.Property(i => i.SilverType).HasMaxLength(50);
            e.Property(i => i.Purity).HasMaxLength(10).IsRequired();
            foreach (var name in new[] { "GrossWeight", "StoneWeight", "NetWeight" })
                e.Property(name).HasPrecision(12, 3);
            foreach (var name in new[] { "RatePerGram", "SilverValue", "MakingCharges", "OtherCharges", "Amount" })
                e.Property(name).HasPrecision(18, 2);
        });
    }
}
