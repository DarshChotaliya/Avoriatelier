using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;
using Purchase.Api.Services;

namespace Purchase.Api.Tests;

public class ErpTests
{
    private readonly PurchaseDbContext _db;
    private readonly PurchaseInvoiceService _purchases;
    private readonly SalesInvoiceService _sales;
    private readonly MasterService _masters;

    public ErpTests()
    {
        var options = new DbContextOptionsBuilder<PurchaseDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new PurchaseDbContext(options);
        ErpSeeder.SeedAsync(_db).GetAwaiter().GetResult();
        _purchases = new PurchaseInvoiceService(_db, new SystemUser("owner"));
        _sales = new SalesInvoiceService(_db, new SystemUser("owner"));
        _masters = new MasterService(_db);
    }

    // Item 1 of the Lurba packing list JS/26-27/178 (CLE-0314-B).
    private static PurchaseItemRequest LurbaItem(string diamondType = "AD", int qty = 1) => new()
    {
        Category = "Earring", DiamondType = diamondType, MetalType = "S925", Qty = qty,
        GrossWeight = 0.562m, NetWeight = 0.474m, MetalRate = 246.98m, LabourRate = 500, LabourMinimum = 500,
        Hallmark = 140, GstPercent = 3, Mrp = 3000,
        Stones = { new StoneRowDto { StoneType = "CZ PRN", Pricing = "perCt", Pcs = 2, Weight = 0.44m, Rate = 250 } },
    };

    private static PurchaseInvoiceRequest Invoice(params PurchaseItemRequest[] items) => new()
    {
        PurchaseDate = new DateOnly(2026, 6, 27), Branch = "SURAT", SupplierName = "LURBA LUXURRY PVT LTD",
        SupplierInvoiceNo = "JS/26-27/178", Items = items.ToList(),
    };

    private static SalesInvoiceRequest Sale(string sku, int qty) => new()
    {
        InvoiceDate = new DateOnly(2026, 7, 1), Branch = "SURAT", CustomerName = "Riya", SalesChannel = "STORE",
        PaymentMethod = "CASH", PaymentStatus = "PAID", OrderStatus = "DELIVERED",
        Lines = { new SalesLineDto { SkuNo = sku, Qty = qty, NetWeight = 0.474m, Selling = 1500, GstPercent = 3 } },
    };

    [Fact]
    public void Gst_is_charged_on_the_whole_price_and_the_hallmark_carries_18_percent_on_top()
    {
        var item = new PurchaseInvoiceItem { Price = 72570m, Hallmark = 70m, GstPercent = 3m };
        // 72,570 × 1.03 + 70 × 18%
        Assert.Equal(74759.70m, ErpCalculator.PriceWithGst(item));
    }

    [Fact]
    public void Cost_per_piece_matches_the_supplier_bill()
    {
        var item = new PurchaseInvoiceItem
        {
            NetWeight = 0.474m, MetalRate = 246.98m, LabourRate = 500, LabourMinimum = 500, Hallmark = 140,
            Stones = { new PurchaseItemStone { Pricing = "perCt", Pcs = 2, Weight = 0.44m, Rate = 250 } },
        };
        Assert.Equal(867.07m, ErpCalculator.CostPerPiece(item));

        item.NetWeight = 1.237m;
        item.Stones.Clear();
        Assert.Equal(305.51m + 618.5m + 140m, ErpCalculator.CostPerPiece(item));
    }

    [Fact]
    public void Single_stones_are_priced_per_certificate()
    {
        var stone = new PurchaseItemStone { Pricing = "perCert", Pcs = 2, Weight = 0.5m, Rate = 8000 };
        Assert.Equal(16000m, ErpCalculator.StoneAmount(stone));
    }

    [Fact]
    public async Task New_items_get_running_SKUs_from_the_sku_format_and_the_server_cost()
    {
        // Company + item code + size + gender + one running number: AV + EA + (no size) + U + 00001.
        var ring = LurbaItem("Natural");
        ring.Category = "Ring";
        ring.Size = "14";
        ring.Collection = "Women";
        var first = await _purchases.CreateAsync(Invoice(LurbaItem(), ring), default);
        var second = await _purchases.CreateAsync(Invoice(LurbaItem()), default);

        Assert.Equal(new[] { "AVEAU00001", "AVRI14W00002" }, first.Items.Select(i => i.SkuNo));
        Assert.Equal("AVEAU00003", second.Items[0].SkuNo);
        Assert.Equal(3, (await _db.SkuSettings.SingleAsync()).Counter);
        Assert.Equal(867.07m, first.Items[0].Price);
        Assert.Equal("CZ PRN", first.Items[0].Stones[0].StoneType);
    }

    [Fact]
    public async Task Editing_keeps_SKUs_and_protects_sold_stock()
    {
        var inv = await _purchases.CreateAsync(Invoice(LurbaItem(qty: 3), LurbaItem()), default);
        var (a, b) = (inv.Items[0], inv.Items[1]);
        await _sales.CreateAsync(Sale(a.SkuNo, 2), default);

        var keepA = LurbaItem(qty: 2);
        keepA.Id = a.Id;
        keepA.Mrp = 5000;
        var edited = await _purchases.UpdateAsync(inv.Id, Invoice(keepA, LurbaItem("Gem Stone")), default);

        Assert.Equal(new[] { a.SkuNo, "AVEAU00003" }, edited!.Items.Select(i => i.SkuNo));
        Assert.Equal(5000m, edited.Items[0].Mrp);
        Assert.DoesNotContain(edited.Items, i => i.SkuNo == b.SkuNo);

        var tooFew = LurbaItem(qty: 1);
        tooFew.Id = a.Id;
        var ex = await Assert.ThrowsAsync<BusinessValidationException>(
            () => _purchases.UpdateAsync(inv.Id, Invoice(tooFew), default));
        Assert.Contains("already sold", ex.Message);

        await Assert.ThrowsAsync<BusinessValidationException>(() => _purchases.DeleteAsync(inv.Id, default));
        await Assert.ThrowsAsync<BusinessValidationException>(() => _purchases.DeleteItemAsync(inv.Id, a.Id, default));
        await Assert.ThrowsAsync<BusinessValidationException>(() => _purchases.RenameSkuAsync(a.SkuNo, "AD-09999", default));
    }

    [Fact]
    public async Task Sales_cannot_exceed_stock_and_numbers_run_on()
    {
        var inv = await _purchases.CreateAsync(Invoice(LurbaItem(qty: 3)), default);
        var sku = inv.Items[0].SkuNo;

        var s1 = await _sales.CreateAsync(Sale(sku, 2), default);
        var ex = await Assert.ThrowsAsync<BusinessValidationException>(() => _sales.CreateAsync(Sale(sku, 2), default));
        Assert.Contains("1 available", ex.Message);
        var s2 = await _sales.CreateAsync(Sale(sku, 1), default);

        Assert.Equal(new[] { "SAL-00001", "SAL-00002" }, new[] { s1.InvoiceNo, s2.InvoiceNo });
        await Assert.ThrowsAsync<BusinessValidationException>(() => _sales.CreateAsync(Sale("XX-1", 1), default));

        Assert.True(await _sales.DeleteAsync(s1.Id, default));
        await _sales.CreateAsync(Sale(sku, 2), default);
    }

    [Fact]
    public async Task Deleting_the_last_item_removes_the_invoice_and_SKUs_can_be_renamed()
    {
        var inv = await _purchases.CreateAsync(Invoice(LurbaItem()), default);
        Assert.Equal("AVEAU00010", await _purchases.RenameSkuAsync("AVEAU00001", " aveau00010 ", default));
        Assert.True(await _purchases.DeleteItemAsync(inv.Id, inv.Items[0].Id, default));
        Assert.Empty(await _purchases.GetAllAsync(default));
    }

    [Fact]
    public async Task Masters_are_seeded_unique_protected_while_in_use_and_renamed_everywhere()
    {
        var all = await _masters.GetAllAsync(default);
        var diamondTypes = Assert.IsAssignableFrom<IEnumerable<DiamondTypeMaster>>(all["diamondTypes"]);
        Assert.Equal(new[] { "AD", "Natural", "Lab Grown", "Gem Stone" }, diamondTypes.Select(d => d.Name));

        JsonElement Json(object o) => JsonSerializer.SerializeToElement(o);
        var saved = (Customer)await _masters.SaveAsync("customers", Json(new { name = "Kamlesh", contactNo = "7874607111" }), default);
        await Assert.ThrowsAsync<BusinessValidationException>(
            () => _masters.SaveAsync("customers", Json(new { name = " kamlesh " }), default));
        await _masters.SaveAsync("customers", Json(new { id = saved.Id, name = "Kamlesh", city = "Surat" }), default);
        Assert.Equal("Surat", (await _db.Customers.SingleAsync()).City);

        await _purchases.CreateAsync(Invoice(LurbaItem()), default);
        var s925 = await _db.MetalTypes.SingleAsync(m => m.Name == "S925");
        await Assert.ThrowsAsync<BusinessValidationException>(() => _masters.DeleteAsync("metalTypes", s925.Id, default));
        Assert.True(await _masters.DeleteAsync("customers", saved.Id, default));

        // Renaming a master that invoices use renames it in those invoices too.
        await _masters.SaveAsync("metalTypes", Json(new { id = s925.Id, name = "SILVER 925", metal = "Silver" }), default);
        Assert.Equal("SILVER 925", (await _db.PurchaseInvoiceItems.SingleAsync()).MetalType);
        await Assert.ThrowsAsync<BusinessValidationException>(() => _masters.DeleteAsync("metalTypes", s925.Id, default));
    }

    [Fact]
    public async Task A_sale_can_be_changed_until_it_is_delivered()
    {
        var invoice = await _purchases.CreateAsync(Invoice(LurbaItem(qty: 2)), default);
        var sku = invoice.Items[0].SkuNo;
        var request = Sale(sku, 2);
        request.OrderStatus = "PROCESSING";
        var sale = await _sales.CreateAsync(request, default);

        // Its own two pieces do not count against the stock check; three would be too many.
        request.CustomerName = "Riya Shah";
        request.RoundOff = -1;
        var changed = await _sales.UpdateAsync(sale.Id, request, default);
        Assert.Equal("Riya Shah", changed!.CustomerName);
        Assert.Equal(sale.InvoiceNo, changed.InvoiceNo);
        Assert.Equal(-1m, changed.RoundOff);
        Assert.Single(await _db.SalesInvoiceLines.ToListAsync());
        var tooMany = Sale(sku, 3);
        await Assert.ThrowsAsync<BusinessValidationException>(() => _sales.UpdateAsync(sale.Id, tooMany, default));

        // Once delivered it is closed.
        request.OrderStatus = "DELIVERED";
        await _sales.UpdateAsync(sale.Id, request, default);
        await Assert.ThrowsAsync<BusinessValidationException>(() => _sales.UpdateAsync(sale.Id, request, default));
        Assert.Null(await _sales.UpdateAsync(9999, request, default));
    }

    [Fact]
    public async Task Sku_format_follows_the_settings()
    {
        var s = new SkuSetting { CompanyPrefix = "AV", NameChars = 2, SeqDigits = 5, Separator = "" };
        Assert.Equal("AVRI14W00081", SkuFormatter.Build(s, "Ring", "14", "Women", 81));
        Assert.Equal("AVNE16M00007", SkuFormatter.Build(s, "Necklace", "16 in", "Men", 7));
        Assert.Equal("AVBA24K00008", SkuFormatter.Build(s, "Bangle", "2-4", "Kids", 8));
        Assert.Equal("AVPEU00009", SkuFormatter.Build(s, "Pendant", null, "Heritage", 9));

        // Saved settings: 3 letters, 4 digits, dashes, and the counter set by hand.
        var saved = await new SkuService(_db).SaveAsync(new SkuSettingRequest
        {
            CompanyPrefix = " cq ", NameChars = 3, SeqDigits = 4, Separator = "-", Counter = 348,
        }, default);
        Assert.Equal("CQ", saved.CompanyPrefix);
        var item = LurbaItem();
        item.Category = "Ring";
        item.Size = "14";
        item.Collection = "Women";
        Assert.Equal("CQ-RIN-14-W-0349", (await _purchases.CreateAsync(Invoice(item), default)).Items[0].SkuNo);
        await Assert.ThrowsAsync<BusinessValidationException>(() => new SkuService(_db).SaveAsync(
            new SkuSettingRequest { CompanyPrefix = "--", NameChars = 2, SeqDigits = 5 }, default));

        // A category's own short code (Item Categories master) replaces the first letters of its name.
        var ring = await _db.ItemCategories.SingleAsync(c => c.Name == "Ring");
        var category = (ItemCategory)await _masters.SaveAsync("categories",
            JsonSerializer.SerializeToElement(new { id = ring.Id, name = "Ring", shortCode = " rg " }), default);
        Assert.Equal("RG", category.ShortCode);
        Assert.Equal("CQ-RG-14-W-0350", (await _purchases.CreateAsync(Invoice(item), default)).Items[0].SkuNo);
    }

    [Fact]
    public async Task Lists_link_to_item_photos_and_a_link_sent_back_keeps_the_photo()
    {
        const string photo = "data:image/jpeg;base64,/9j/AAAA";
        var item = LurbaItem();
        item.Thumb = photo;
        var saved = await _purchases.CreateAsync(Invoice(item), default);
        var link = saved.Items[0].Thumb!;
        Assert.StartsWith($"/api/purchase-items/{saved.Items[0].Id}/photo?v=", link);
        Assert.Equal(photo, (await _db.PurchaseInvoiceItems.SingleAsync()).Photo);

        // Saving the invoice as the list sent it (photo as a link) leaves the photo alone; an empty one removes it.
        var again = Invoice(item);
        again.Items[0].Id = saved.Items[0].Id;
        again.Items[0].Thumb = link;
        await _purchases.UpdateAsync(saved.Id, again, default);
        Assert.Equal(photo, (await _db.PurchaseInvoiceItems.AsNoTracking().SingleAsync()).Photo);
        Assert.Equal("image/jpeg", ItemPhoto.Decode(photo)!.Value.ContentType);
        again.Items[0].Thumb = null;
        await _purchases.UpdateAsync(saved.Id, again, default);
        Assert.Null((await _db.PurchaseInvoiceItems.AsNoTracking().SingleAsync()).Photo);
    }

    [Fact]
    public async Task A_sale_is_made_from_a_delivered_order_and_only_once()
    {
        var orders = new OrderService(_db, new SystemUser("owner"));
        var order = await orders.CreateAsync(new OrderRequest
        {
            ClientName = "Riya", ClientOrderDate = new DateOnly(2026, 7, 1), Description = "CQ SET", Status = "In Production",
        }, default);
        var invoice = await _purchases.CreateAsync(Invoice(LurbaItem(qty: 2)), default);
        var request = Sale(invoice.Items[0].SkuNo, 1);
        request.OrderNo = order.OrderNo.ToLowerInvariant();

        // Not delivered yet: no sales invoice. A made-up order number is refused too.
        await Assert.ThrowsAsync<BusinessValidationException>(() => _sales.CreateAsync(request, default));
        request.OrderNo = "ORD-99999";
        await Assert.ThrowsAsync<BusinessValidationException>(() => _sales.CreateAsync(request, default));

        // Delivered: the sale carries the order number; a second sale for the same order is refused.
        await orders.UpdateAsync(order.Id, new OrderRequest
        {
            ClientName = "Riya", ClientOrderDate = new DateOnly(2026, 7, 1), Description = "CQ SET", Status = "Delivered",
        }, default);
        request.OrderNo = order.OrderNo;
        request.OrderStatus = "PROCESSING"; // a delivered sale is closed; this one can still be changed
        var sale = await _sales.CreateAsync(request, default);
        Assert.Equal(order.OrderNo, sale.OrderNo);
        var again = Sale(invoice.Items[0].SkuNo, 1);
        again.OrderStatus = "PROCESSING";
        again.OrderNo = order.OrderNo;
        await Assert.ThrowsAsync<BusinessValidationException>(() => _sales.CreateAsync(again, default));

        // Changing that sale later keeps its own order and is not blocked by itself.
        Assert.Equal(order.OrderNo, (await _sales.UpdateAsync(sale.Id, request, default))!.OrderNo);
    }

    [Fact]
    public void Fixed_labour_is_the_typed_amount_instead_of_a_rate_per_gram()
    {
        var item = new PurchaseInvoiceItem { NetWeight = 0.474m, MetalRate = 246.98m, LabourRate = 500m, Hallmark = 140m };
        Assert.Equal(237m, ErpCalculator.Labour(item));
        Assert.Equal(494.07m, ErpCalculator.CostPerPiece(item));
        item.LabourFixed = true;
        Assert.Equal(500m, ErpCalculator.Labour(item));
        Assert.Equal(757.07m, ErpCalculator.CostPerPiece(item));
    }

    [Fact]
    public async Task Stone_names_and_diamond_shapes_are_masters()
    {
        var all = await _masters.GetAllAsync(default);
        Assert.Contains("Ruby", Assert.IsAssignableFrom<IEnumerable<StoneNameMaster>>(all["stoneNames"]).Select(s => s.Name));
        Assert.Contains("Oval", Assert.IsAssignableFrom<IEnumerable<DiamondShapeMaster>>(all["diamondShapes"]).Select(s => s.Name));

        var topaz = (StoneNameMaster)await _masters.SaveAsync("stoneNames",
            JsonSerializer.SerializeToElement(new { name = "Topaz" }), default);
        await Assert.ThrowsAsync<BusinessValidationException>(() => _masters.SaveAsync("stoneNames",
            JsonSerializer.SerializeToElement(new { name = "topaz" }), default));
        Assert.True(await _masters.DeleteAsync("stoneNames", topaz.Id, default));
    }
}
