namespace Purchase.Api.Entities;

// ---------- Masters ----------
// Records refer to masters by name (e.g. an item's MetalType = "S925"), matching the frontend.

public abstract class MasterEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Customer : MasterEntity
{
    public string? ContactNo { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Email { get; set; }
    public string? GstNo { get; set; }
    public string? Address { get; set; }
}

public class Supplier : MasterEntity
{
    public string? ContactNo { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? GstNo { get; set; }
    public string? PanNo { get; set; }
    public string? Address { get; set; }
}

public class ItemCategory : MasterEntity
{
    /// <summary>Short form used in the SKU (e.g. Ring = RG). Empty: the first letters of the name are used.</summary>
    public string? ShortCode { get; set; }
}

public class ItemCollection : MasterEntity
{
}

public class Branch : MasterEntity
{
    public string? Address { get; set; }
}

public class MetalTypeMaster : MasterEntity
{
    public string Metal { get; set; } = "Silver";
    public decimal Purity { get; set; }

    /// <summary>Default metal rate per gram for purchase items.</summary>
    public decimal Rate { get; set; }

    /// <summary>
    /// Quotation share of the 999 rate, e.g. 18KT = 78 (the "metal purity charge" of the client's sheet). With today's
    /// 999 rate it gives the quotation rate.
    /// </summary>
    public decimal QuotePercent { get; set; }

    /// <summary>Selling rate per gram used only by quotations: today's 999 rate × QuotePercent.</summary>
    public decimal QuoteRate { get; set; }

    /// <summary>
    /// Weight of a piece in this metal relative to S925 silver (= 1). A quotation converts a design's weight from one
    /// metal to another with it: new weight = weight × (to factor ÷ from factor).
    /// </summary>
    public decimal WeightFactor { get; set; } = 1m;
}

public class DiamondTypeMaster : MasterEntity
{
    public string SkuPrefix { get; set; } = string.Empty;
}

/// <summary>
/// Pricing: "perCt" (loose stone: Wt × rate per carat) or "perCert" (single stone: Pcs × rate per piece; the weight is
/// only the total for the record).
/// </summary>
public class StoneTypeMaster : MasterEntity
{
    public string Pricing { get; set; } = StonePricing.PerCt;
    public decimal Rate { get; set; }
}

/// <summary>Stone names offered on a purchase item's stone rows (CZ, Ruby, …).</summary>
public class StoneNameMaster : MasterEntity
{
}

/// <summary>Diamond shapes offered on a purchase item's diamond rows (Round, Oval, …).</summary>
public class DiamondShapeMaster : MasterEntity
{
}

public static class StonePricing
{
    public const string PerCt = "perCt";
    public const string PerCert = "perCert";
}

// ---------- Purchase invoices (supplier packing list) ----------

public class PurchaseInvoice
{
    public int Id { get; set; }
    public DateOnly PurchaseDate { get; set; }
    public string Branch { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string? SupplierInvoiceNo { get; set; }
    public DateOnly? SupplierInvoiceDate { get; set; }
    public string? Remarks { get; set; }

    /// <summary>Inter-state purchase: IGST instead of CGST + SGST, for the whole invoice.</summary>
    public bool Igst { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Usernames of who created and last changed the invoice.</summary>
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public List<PurchaseInvoiceItem> Items { get; set; } = new();
}

public class PurchaseInvoiceItem
{
    public int Id { get; set; }
    public int PurchaseInvoiceId { get; set; }
    public PurchaseInvoice? PurchaseInvoice { get; set; }
    public int SortOrder { get; set; }

    public string SkuNo { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? DesignCode { get; set; }
    public string? Collection { get; set; }
    public string? Size { get; set; }
    public string DiamondType { get; set; } = string.Empty;
    public string MetalType { get; set; } = string.Empty;
    public int Qty { get; set; }

    public decimal GrossWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal MetalRate { get; set; }
    public decimal LabourRate { get; set; }

    /// <summary>Fixed labour: LabourRate is the labour of one piece as it is, not a rate per gram.</summary>
    public bool LabourFixed { get; set; }
    public decimal LabourMinimum { get; set; }
    public decimal Hallmark { get; set; }
    public decimal OtherCharges { get; set; }

    /// <summary>Cost of one piece; always recalculated on the server.</summary>
    public decimal Price { get; set; }
    public decimal Mrp { get; set; }
    public decimal Discount { get; set; }
    public decimal GstPercent { get; set; }
    public bool Igst { get; set; }
    public string? Description { get; set; }

    /// <summary>Photo as a JPEG data URL (resized in the browser before upload).</summary>
    public string? Photo { get; set; }

    public List<PurchaseItemStone> Stones { get; set; } = new();
    public List<PurchaseItemDiamond> Diamonds { get; set; } = new();
}

public class PurchaseItemStone
{
    public int Id { get; set; }
    public int PurchaseInvoiceItemId { get; set; }
    public int SortOrder { get; set; }
    /// <summary>The stone's shape, from Masters → Stone Shapes (e.g. RND, OVL).</summary>
    public string StoneType { get; set; } = string.Empty;
    public string Pricing { get; set; } = StonePricing.PerCt;

    /// <summary>What the stone is, e.g. CZ, Ruby, Emerald.</summary>
    public string? StoneName { get; set; }

    /// <summary>Stone colour and size (e.g. "Red", "2 mm"); stones of one type are told apart by these.</summary>
    public string? Color { get; set; }
    public string? Size { get; set; }
    public decimal Pcs { get; set; }
    public decimal Weight { get; set; }
    public decimal Rate { get; set; }
}

public class PurchaseItemDiamond
{
    public int Id { get; set; }
    public int PurchaseInvoiceItemId { get; set; }
    public int SortOrder { get; set; }
    public string? Code { get; set; }

    /// <summary>From Masters → Diamond Types (AD, Natural, Lab Grown, …).</summary>
    public string? DiamondType { get; set; }
    public string? Size { get; set; }
    public decimal Pcs { get; set; }
    public decimal Weight { get; set; }
    public decimal Rate { get; set; }
}

// ---------- Sales invoices ----------

public class SalesInvoice
{
    public int Id { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public string Branch { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? ContactNo { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string SalesChannel { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string OrderStatus { get; set; } = string.Empty;
    public string? CourierPartner { get; set; }
    public string? TrackingNo { get; set; }
    public decimal Shipping { get; set; }
    public decimal Expenses { get; set; }

    /// <summary>Manual round-off on the bill (may be negative), e.g. −1 to make 1,06,531 payable as 1,06,530.</summary>
    public decimal RoundOff { get; set; }

    /// <summary>The delivered customer order this bill is for (Quotation → Order → Sale Invoice); one bill per order.</summary>
    public string? OrderNo { get; set; }
    public string? Notes { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public bool ShippingSameAsBilling { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public List<SalesInvoiceLine> Lines { get; set; } = new();
}

public class SalesInvoiceLine
{
    public int Id { get; set; }
    public int SalesInvoiceId { get; set; }
    public int SortOrder { get; set; }
    public string SkuNo { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal NetWeight { get; set; }

    // The bill's columns (like invoice AV-00060): what the piece is and how its amount is made up.
    public string? Description { get; set; }
    public string? HsnSac { get; set; }
    public string? MetalType { get; set; }
    public decimal GrossWeight { get; set; }
    public decimal MetalAmount { get; set; }
    public decimal DiaPcs { get; set; }
    public decimal DiaWeight { get; set; }
    public decimal DiaAmount { get; set; }
    public decimal StonePcs { get; set; }
    public decimal StoneWeight { get; set; }
    public decimal StoneAmount { get; set; }
    public decimal MakingCharges { get; set; }

    public decimal Mrp { get; set; }
    public decimal Discount { get; set; }

    /// <summary>GST-inclusive selling price per piece.</summary>
    public decimal Selling { get; set; }
    public decimal GstPercent { get; set; }
    public bool Igst { get; set; }
}

// ---------- Quotations (price of an existing design made in another metal) ----------

public static class QuotationStatus
{
    public const string Open = "Open";
    public const string Accepted = "Accepted";
    public const string Rejected = "Rejected";
    public static readonly string[] All = { Open, Accepted, Rejected };
}

public static class LabourType
{
    public const string PerGram = "perGram";
    public const string Percent = "percent";
}

public class Quotation
{
    public int Id { get; set; }
    public string QuotationNo { get; set; } = string.Empty;
    public DateOnly QuotationDate { get; set; }
    public string Branch { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? ContactNo { get; set; }
    public string Status { get; set; } = QuotationStatus.Open;
    public string? Notes { get; set; }

    /// <summary>Advance the customer paid on the quotation (mostly for custom designs).</summary>
    public decimal Advance { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public List<QuotationLine> Lines { get; set; } = new();
}

public class QuotationLine
{
    public int Id { get; set; }
    public int QuotationId { get; set; }
    public int SortOrder { get; set; }

    /// <summary>
    /// A custom design (e.g. a Pinterest picture the customer brought) instead of a SKU from stock: no SKU, the weight
    /// is an estimate, and the reference photo, category, size and link describe it.
    /// </summary>
    public bool IsCustom { get; set; }
    public string? Photo { get; set; }
    public string? DesignLink { get; set; }
    public string? Category { get; set; }
    public string? Size { get; set; }

    /// <summary>The design the customer picked from stock, and the metal / net weight it is in stock in.</summary>
    public string SkuNo { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string FromMetal { get; set; } = string.Empty;
    public decimal FromWeight { get; set; }

    /// <summary>The metal the customer wants it in, and the (converted, editable) net weight in that metal.</summary>
    public string ToMetal { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public int Qty { get; set; } = 1;

    public decimal MetalRate { get; set; }
    public string LabourType { get; set; } = Entities.LabourType.PerGram;
    public decimal LabourRate { get; set; }

    /// <summary>Diamonds per piece: carats × rate per carat.</summary>
    public decimal DiamondCt { get; set; }
    public decimal DiamondRate { get; set; }

    /// <summary>Stones and any other charges per piece, in rupees.</summary>
    public decimal StoneAmount { get; set; }
    public decimal OtherCharges { get; set; }

    /// <summary>One-off CAD / design charge for the line (not multiplied by the quantity).</summary>
    public decimal CadCharge { get; set; }
    public decimal GstPercent { get; set; }
}

// ---------- Customer orders (made-to-order pieces, tracked client → manufacturer → CAD → delivery) ----------

public static class OrderStatus
{
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";
    public static readonly string[] All =
        { "Pending", "Order Placed", "CAD Confirmed", "In Production", "Ready", Delivered, Cancelled };
}

public class CustomerOrder
{
    public int Id { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string? ContactNo { get; set; }

    public DateOnly ClientOrderDate { get; set; }
    public DateOnly? OrderPlacedDate { get; set; }
    public DateOnly? CadConfirmedDate { get; set; }
    public DateOnly? DeliveryDate { get; set; }
    public DateOnly? CompletedDate { get; set; }

    public string Description { get; set; } = string.Empty;
    public string? DesignRef { get; set; }
    public string? MetalType { get; set; }
    public string? DiamondType { get; set; }
    public int Qty { get; set; } = 1;
    public string? Manufacturer { get; set; }
    public string Status { get; set; } = "Pending";
    public string? Notes { get; set; }

    /// <summary>The quotation this order came from, its agreed amount and the advance paid (all optional).</summary>
    public string? QuotationNo { get; set; }
    public decimal Amount { get; set; }
    public decimal Advance { get; set; }

    /// <summary>Reference picture of the design (e.g. from the customer for a custom piece).</summary>
    public string? Photo { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}

/// <summary>Today's 999 rate of a metal (Gold, Silver), used only to work out quotation rates.</summary>
public class DailyMetalRate
{
    public int Id { get; set; }
    public string Metal { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

/// <summary>
/// How new SKUs are numbered (one row): Company prefix + item code + size + gender + running number,
/// e.g. AVRI14W00081. Counter is the last number given out.
/// </summary>
public class SkuSetting
{
    public int Id { get; set; }
    public string CompanyPrefix { get; set; } = "AV";
    public int NameChars { get; set; } = 2;
    public int SeqDigits { get; set; } = 5;
    public string Separator { get; set; } = string.Empty;
    public int Counter { get; set; }
}
