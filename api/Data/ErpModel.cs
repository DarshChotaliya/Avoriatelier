using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Purchase.Api.Entities;

namespace Purchase.Api.Data;

/// <summary>Table mapping for the ERP entities (masters, purchase invoices, sales invoices).</summary>
public static class ErpModel
{
    public static void Configure(ModelBuilder b)
    {
        Master<Customer>(b, "customer", e =>
        {
            e.Property(x => x.ContactNo).HasMaxLength(20);
            e.Property(x => x.City).HasMaxLength(100);
            e.Property(x => x.State).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.GstNo).HasMaxLength(20);
            e.Property(x => x.Address).HasMaxLength(500);
        });
        Master<Supplier>(b, "supplier", e =>
        {
            e.Property(x => x.ContactNo).HasMaxLength(20);
            e.Property(x => x.City).HasMaxLength(100);
            e.Property(x => x.State).HasMaxLength(100);
            e.Property(x => x.GstNo).HasMaxLength(20);
            e.Property(x => x.PanNo).HasMaxLength(20);
            e.Property(x => x.Address).HasMaxLength(500);
        });
        Master<ItemCategory>(b, "item_category", e => e.Property(x => x.ShortCode).HasMaxLength(6));
        Master<StoneNameMaster>(b, "stone_name");
        Master<DiamondShapeMaster>(b, "diamond_shape");
        Master<ItemCollection>(b, "item_collection");
        Master<Branch>(b, "branch", e => e.Property(x => x.Address).HasMaxLength(500));
        Master<MetalTypeMaster>(b, "metal_type", e =>
        {
            e.Property(x => x.Metal).HasMaxLength(20).IsRequired();
            e.Property(x => x.Purity).HasPrecision(6, 2);
            e.Property(x => x.Rate).HasPrecision(18, 2);
            e.Property(x => x.WeightFactor).HasPrecision(6, 3).HasDefaultValue(1m);
            e.Property(x => x.QuoteRate).HasPrecision(18, 2);
            e.Property(x => x.QuotePercent).HasPrecision(6, 2);
        });
        Master<DiamondTypeMaster>(b, "diamond_type", e => e.Property(x => x.SkuPrefix).HasMaxLength(10).IsRequired());
        Master<StoneTypeMaster>(b, "stone_type", e =>
        {
            e.Property(x => x.Pricing).HasMaxLength(10).IsRequired();
            e.Property(x => x.Rate).HasPrecision(18, 2);
        });

        b.Entity<AppUser>(e =>
        {
            e.ToTable("app_user");
            e.Property(x => x.Username).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.FullName).HasMaxLength(100).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            e.Property(x => x.Role).HasMaxLength(20).IsRequired();
            e.Property(x => x.Branches).HasMaxLength(500);
        });

        b.Entity<PurchaseInvoice>(e =>
        {
            e.ToTable("purchase_invoice");
            e.Property(x => x.CreatedBy).HasMaxLength(50);
            e.Property(x => x.UpdatedBy).HasMaxLength(50);
            e.Property(x => x.Branch).HasMaxLength(100).IsRequired();
            e.Property(x => x.SupplierName).HasMaxLength(200).IsRequired();
            e.Property(x => x.SupplierInvoiceNo).HasMaxLength(50);
            e.Property(x => x.Remarks).HasMaxLength(500);
            e.HasIndex(x => x.PurchaseDate);
            e.HasMany(x => x.Items).WithOne(i => i.PurchaseInvoice!).HasForeignKey(i => i.PurchaseInvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<PurchaseInvoiceItem>(e =>
        {
            e.ToTable("purchase_invoice_item");
            e.Property(x => x.SkuNo).HasMaxLength(30).IsRequired();
            e.HasIndex(x => x.SkuNo).IsUnique();
            foreach (var name in new[] { "Category", "DiamondType", "MetalType", "Collection" })
                e.Property(name).HasMaxLength(100);
            e.Property(x => x.DesignCode).HasMaxLength(50);
            e.Property(x => x.Size).HasMaxLength(50);
            e.Property(x => x.Description).HasMaxLength(500);
            foreach (var name in new[] { "GrossWeight", "NetWeight" })
                e.Property(name).HasPrecision(12, 3);
            foreach (var name in new[] { "MetalRate", "LabourRate", "LabourMinimum", "Hallmark", "OtherCharges", "Price",
                         "Mrp", "Discount" })
                e.Property(name).HasPrecision(18, 2);
            e.Property(x => x.GstPercent).HasPrecision(5, 2);
            e.HasMany(x => x.Stones).WithOne().HasForeignKey(s => s.PurchaseInvoiceItemId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Diamonds).WithOne().HasForeignKey(d => d.PurchaseInvoiceItemId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<PurchaseItemStone>(e =>
        {
            e.ToTable("purchase_item_stone");
            e.Property(x => x.StoneType).HasMaxLength(100).IsRequired();
            e.Property(x => x.Pricing).HasMaxLength(10).IsRequired();
            e.Property(x => x.StoneName).HasMaxLength(100);
            e.Property(x => x.Color).HasMaxLength(50);
            e.Property(x => x.Size).HasMaxLength(50);
            e.Property(x => x.Pcs).HasPrecision(12, 2);
            e.Property(x => x.Weight).HasPrecision(12, 3);
            e.Property(x => x.Rate).HasPrecision(18, 2);
        });

        b.Entity<PurchaseItemDiamond>(e =>
        {
            e.ToTable("purchase_item_diamond");
            e.Property(x => x.Code).HasMaxLength(50);
            e.Property(x => x.DiamondType).HasMaxLength(200);
            e.Property(x => x.Size).HasMaxLength(50);
            e.Property(x => x.Pcs).HasPrecision(12, 2);
            e.Property(x => x.Weight).HasPrecision(12, 3);
            e.Property(x => x.Rate).HasPrecision(18, 2);
        });

        b.Entity<SalesInvoice>(e =>
        {
            e.ToTable("sales_invoice");
            e.Property(x => x.CreatedBy).HasMaxLength(50);
            e.Property(x => x.UpdatedBy).HasMaxLength(50);
            e.Property(x => x.InvoiceNo).HasMaxLength(30).IsRequired();
            e.HasIndex(x => x.InvoiceNo).IsUnique();
            e.Property(x => x.OrderNo).HasMaxLength(30);
            e.HasIndex(x => x.InvoiceDate);
            e.Property(x => x.Branch).HasMaxLength(100).IsRequired();
            e.Property(x => x.CustomerName).HasMaxLength(200).IsRequired();
            foreach (var name in new[] { "ContactNo", "SalesChannel", "PaymentMethod", "PaymentStatus", "OrderStatus" })
                e.Property(name).HasMaxLength(30);
            foreach (var name in new[] { "City", "State", "CourierPartner" })
                e.Property(name).HasMaxLength(100);
            e.Property(x => x.TrackingNo).HasMaxLength(50);
            foreach (var name in new[] { "Notes", "BillingAddress", "ShippingAddress" })
                e.Property(name).HasMaxLength(500);
            e.Property(x => x.Shipping).HasPrecision(18, 2);
            e.Property(x => x.Expenses).HasPrecision(18, 2);
            e.Property(x => x.RoundOff).HasPrecision(18, 2);
            e.HasMany(x => x.Lines).WithOne().HasForeignKey(l => l.SalesInvoiceId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<SalesInvoiceLine>(e =>
        {
            e.ToTable("sales_invoice_line");
            e.Property(x => x.SkuNo).HasMaxLength(30).IsRequired();
            e.HasIndex(x => x.SkuNo);
            e.Property(x => x.NetWeight).HasPrecision(12, 3);
            e.Property(x => x.Description).HasMaxLength(200);
            e.Property(x => x.HsnSac).HasMaxLength(20);
            e.Property(x => x.MetalType).HasMaxLength(100);
            foreach (var name in new[] { "GrossWeight", "DiaWeight", "StoneWeight" })
                e.Property(name).HasPrecision(12, 3);
            foreach (var name in new[] { "DiaPcs", "StonePcs" })
                e.Property(name).HasPrecision(12, 2);
            foreach (var name in new[] { "Mrp", "Discount", "Selling", "MetalAmount", "DiaAmount", "StoneAmount", "MakingCharges" })
                e.Property(name).HasPrecision(18, 2);
            e.Property(x => x.GstPercent).HasPrecision(5, 2);
        });

        b.Entity<Quotation>(e =>
        {
            e.ToTable("quotation");
            e.Property(x => x.QuotationNo).HasMaxLength(30).IsRequired();
            e.HasIndex(x => x.QuotationNo).IsUnique();
            e.HasIndex(x => x.QuotationDate);
            e.Property(x => x.Branch).HasMaxLength(100).IsRequired();
            e.Property(x => x.CustomerName).HasMaxLength(200).IsRequired();
            e.Property(x => x.ContactNo).HasMaxLength(20);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.Notes).HasMaxLength(500);
            e.Property(x => x.Advance).HasPrecision(18, 2);
            e.Property(x => x.CreatedBy).HasMaxLength(50);
            e.Property(x => x.UpdatedBy).HasMaxLength(50);
            e.HasMany(x => x.Lines).WithOne().HasForeignKey(l => l.QuotationId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<SkuSetting>(e =>
        {
            e.ToTable("sku_setting");
            e.Property(x => x.CompanyPrefix).HasMaxLength(6).IsRequired();
            e.Property(x => x.Separator).HasMaxLength(1).IsRequired();
        });

        b.Entity<DailyMetalRate>(e =>
        {
            e.ToTable("daily_metal_rate");
            e.Property(x => x.Metal).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Metal).IsUnique();
            e.Property(x => x.Rate).HasPrecision(18, 2);
            e.Property(x => x.UpdatedBy).HasMaxLength(50);
        });

        b.Entity<CustomerOrder>(e =>
        {
            e.ToTable("customer_order");
            e.Property(x => x.OrderNo).HasMaxLength(30).IsRequired();
            e.HasIndex(x => x.OrderNo).IsUnique();
            e.HasIndex(x => x.ClientOrderDate);
            e.Property(x => x.Branch).HasMaxLength(100).IsRequired();
            e.Property(x => x.ClientName).HasMaxLength(200).IsRequired();
            e.Property(x => x.ContactNo).HasMaxLength(20);
            e.Property(x => x.Description).HasMaxLength(200).IsRequired();
            e.Property(x => x.DesignRef).HasMaxLength(50);
            foreach (var name in new[] { "MetalType", "DiamondType", "Manufacturer" })
                e.Property(name).HasMaxLength(200);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.Notes).HasMaxLength(500);
            e.Property(x => x.QuotationNo).HasMaxLength(30);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.Advance).HasPrecision(18, 2);
            e.Property(x => x.CreatedBy).HasMaxLength(50);
            e.Property(x => x.UpdatedBy).HasMaxLength(50);
        });

        b.Entity<QuotationLine>(e =>
        {
            e.ToTable("quotation_line");
            e.Property(x => x.SkuNo).HasMaxLength(30).IsRequired();
            e.Property(x => x.Description).HasMaxLength(200);
            e.Property(x => x.DesignLink).HasMaxLength(500);
            e.Property(x => x.Category).HasMaxLength(200);
            e.Property(x => x.Size).HasMaxLength(50);
            e.Property(x => x.FromMetal).HasMaxLength(200).IsRequired();
            e.Property(x => x.ToMetal).HasMaxLength(200).IsRequired();
            e.Property(x => x.LabourType).HasMaxLength(10).IsRequired();
            e.Property(x => x.FromWeight).HasPrecision(12, 3);
            e.Property(x => x.Weight).HasPrecision(12, 3);
            foreach (var name in new[] { "MetalRate", "LabourRate", "StoneAmount", "OtherCharges", "DiamondRate", "CadCharge" })
                e.Property(name).HasPrecision(18, 2);
            e.Property(x => x.DiamondCt).HasPrecision(12, 3);
            e.Property(x => x.GstPercent).HasPrecision(5, 2);
        });
    }

    /// <summary>Common master mapping: table name, required unique Name (max 200).</summary>
    private static void Master<T>(ModelBuilder b, string table, Action<EntityTypeBuilder<T>>? extra = null)
        where T : MasterEntity
    {
        b.Entity<T>(e =>
        {
            e.ToTable(table);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            extra?.Invoke(e);
        });
    }
}
