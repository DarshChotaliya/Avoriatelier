using System.ComponentModel.DataAnnotations;
using Purchase.Api.Entities;

namespace Purchase.Api.Dtos;

// Shapes match the React app (src/utils/draftInvoices.js, draftSales.js), so the screens did not change.

// ---------- Purchase invoices ----------

public class StoneRowDto
{
    [MaxLength(100)] public string StoneType { get; set; } = string.Empty;
    [MaxLength(10)] public string Pricing { get; set; } = "perCt";
    [MaxLength(100)] public string? StoneName { get; set; }
    [MaxLength(50)] public string? Color { get; set; }
    [MaxLength(50)] public string? Size { get; set; }
    [Range(0, 1_000_000)] public decimal Pcs { get; set; }
    [Range(0, 1_000_000)] public decimal Weight { get; set; }
    [Range(0, double.MaxValue)] public decimal Rate { get; set; }
}

public class DiamondRowDto
{
    [MaxLength(50)] public string? Code { get; set; }
    [MaxLength(200)] public string? DiamondType { get; set; }
    [MaxLength(50)] public string? Size { get; set; }
    [Range(0, 1_000_000)] public decimal Pcs { get; set; }
    [Range(0, 1_000_000)] public decimal Weight { get; set; }
    [Range(0, double.MaxValue)] public decimal Rate { get; set; }
}

public class PurchaseItemRequest
{
    /// <summary>Set for items that already exist (editing); new items leave it empty.</summary>
    public int? Id { get; set; }

    /// <summary>Only used when importing old data that already has SKU numbers; otherwise assigned on save.</summary>
    [MaxLength(30)] public string? SkuNo { get; set; }

    [Required, MaxLength(100)] public string Category { get; set; } = string.Empty;
    [MaxLength(50)] public string? DesignCode { get; set; }
    [MaxLength(100)] public string? Collection { get; set; }
    [MaxLength(50)] public string? Size { get; set; }
    [Required, MaxLength(100)] public string DiamondType { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string MetalType { get; set; } = string.Empty;
    [Range(1, 1_000_000)] public int Qty { get; set; }
    [Range(0, 1_000_000)] public decimal GrossWeight { get; set; }
    [Range(0, 1_000_000)] public decimal NetWeight { get; set; }
    [Range(0, double.MaxValue)] public decimal MetalRate { get; set; }
    [Range(0, double.MaxValue)] public decimal LabourRate { get; set; }
    [Range(0, double.MaxValue)] public decimal LabourMinimum { get; set; }
    [Range(0, double.MaxValue)] public decimal Hallmark { get; set; }
    [Range(0, double.MaxValue)] public decimal OtherCharges { get; set; }
    [Range(0, double.MaxValue)] public decimal Mrp { get; set; }
    [Range(0, double.MaxValue)] public decimal Discount { get; set; }
    [Range(0, 100)] public decimal GstPercent { get; set; }
    public bool Igst { get; set; }
    [MaxLength(500)] public string? Description { get; set; }

    /// <summary>Photo as a JPEG data URL (≈ 50 KB after the browser resizes it).</summary>
    [MaxLength(3_000_000)] public string? Thumb { get; set; }

    public List<StoneRowDto> Stones { get; set; } = new();
    public List<DiamondRowDto> Diamonds { get; set; } = new();
}

public class PurchaseInvoiceRequest
{
    [Required] public DateOnly PurchaseDate { get; set; }
    [Required, MaxLength(100)] public string Branch { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string SupplierName { get; set; } = string.Empty;
    [MaxLength(50)] public string? SupplierInvoiceNo { get; set; }
    public DateOnly? SupplierInvoiceDate { get; set; }
    [MaxLength(500)] public string? Remarks { get; set; }
    public bool Igst { get; set; }
    public List<PurchaseItemRequest> Items { get; set; } = new();
}

public record PurchaseItemDto(
    int Id, string SkuNo, string Category, string? DesignCode, string? Collection, string? Size, string DiamondType,
    string MetalType, int Qty, decimal GrossWeight, decimal NetWeight, decimal MetalRate, decimal LabourRate,
    decimal LabourMinimum, decimal Hallmark, decimal OtherCharges, decimal Price, decimal Mrp, decimal Discount,
    decimal GstPercent, bool Igst, string? Description, string? Thumb, List<StoneRowDto> Stones,
    List<DiamondRowDto> Diamonds);

public record PurchaseInvoiceDto(
    int Id, DateOnly PurchaseDate, string Branch, string SupplierName, string? SupplierInvoiceNo,
    DateOnly? SupplierInvoiceDate, string? Remarks, bool Igst, DateTime CreatedAt, DateTime UpdatedAt,
    List<PurchaseItemDto> Items, string? CreatedBy, string? UpdatedBy);

public class RenameSkuRequest
{
    [Required, MaxLength(30)] public string NewSku { get; set; } = string.Empty;
}

// ---------- Sales invoices ----------

public class SalesLineDto
{
    [Required, MaxLength(30)] public string SkuNo { get; set; } = string.Empty;
    [Range(1, 1_000_000)] public int Qty { get; set; }
    [Range(0, 1_000_000)] public decimal NetWeight { get; set; }
    [MaxLength(200)] public string? Description { get; set; }
    [MaxLength(20)] public string? HsnSac { get; set; }
    [MaxLength(100)] public string? MetalType { get; set; }
    [Range(0, 1_000_000)] public decimal GrossWeight { get; set; }
    [Range(0, double.MaxValue)] public decimal MetalAmount { get; set; }
    [Range(0, 1_000_000)] public decimal DiaPcs { get; set; }
    [Range(0, 1_000_000)] public decimal DiaWeight { get; set; }
    [Range(0, double.MaxValue)] public decimal DiaAmount { get; set; }
    [Range(0, 1_000_000)] public decimal StonePcs { get; set; }
    [Range(0, 1_000_000)] public decimal StoneWeight { get; set; }
    [Range(0, double.MaxValue)] public decimal StoneAmount { get; set; }
    [Range(0, double.MaxValue)] public decimal MakingCharges { get; set; }
    [Range(0, double.MaxValue)] public decimal Mrp { get; set; }
    [Range(0, double.MaxValue)] public decimal Discount { get; set; }
    [Range(0, double.MaxValue)] public decimal Selling { get; set; }
    [Range(0, 100)] public decimal GstPercent { get; set; }
    public bool Igst { get; set; }
}

public class SalesInvoiceRequest
{
    /// <summary>Only used when importing old data; otherwise the next SAL- number is assigned.</summary>
    [MaxLength(30)] public string? InvoiceNo { get; set; }
    [Required] public DateOnly InvoiceDate { get; set; }
    [Required, MaxLength(100)] public string Branch { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string CustomerName { get; set; } = string.Empty;
    [MaxLength(20)] public string? ContactNo { get; set; }
    [MaxLength(100)] public string? City { get; set; }
    [MaxLength(100)] public string? State { get; set; }
    [MaxLength(30)] public string SalesChannel { get; set; } = string.Empty;
    [MaxLength(30)] public string PaymentMethod { get; set; } = string.Empty;
    [MaxLength(30)] public string PaymentStatus { get; set; } = string.Empty;
    [MaxLength(30)] public string OrderStatus { get; set; } = string.Empty;
    [MaxLength(100)] public string? CourierPartner { get; set; }
    [MaxLength(50)] public string? TrackingNo { get; set; }
    [Range(0, double.MaxValue)] public decimal Shipping { get; set; }
    [Range(0, double.MaxValue)] public decimal Expenses { get; set; }
    [Range(-1_000_000, 1_000_000)] public decimal RoundOff { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
    [MaxLength(500)] public string? BillingAddress { get; set; }
    [MaxLength(500)] public string? ShippingAddress { get; set; }
    public bool ShippingSameAsBilling { get; set; }
    public List<SalesLineDto> Lines { get; set; } = new();
}

public record SalesInvoiceDto(
    int Id, string InvoiceNo, DateOnly InvoiceDate, string Branch, string CustomerName, string? ContactNo,
    string? City, string? State, string SalesChannel, string PaymentMethod, string PaymentStatus, string OrderStatus,
    string? CourierPartner, string? TrackingNo, decimal Shipping, decimal Expenses, string? Notes,
    string? BillingAddress, string? ShippingAddress, bool ShippingSameAsBilling, DateTime CreatedAt,
    List<SalesLineDto> Lines, string? CreatedBy, decimal RoundOff);

// ---------- Quotations ----------

public class QuotationLineDto
{
    public bool IsCustom { get; set; }
    /// <summary>Reference photo of a custom design, a JPEG data URL resized in the browser (about 3 MB at most).</summary>
    [MaxLength(4_000_000)] public string? Photo { get; set; }
    [MaxLength(500)] public string? DesignLink { get; set; }
    [MaxLength(200)] public string? Category { get; set; }
    [MaxLength(50)] public string? Size { get; set; }
    [MaxLength(30)] public string SkuNo { get; set; } = string.Empty;
    [MaxLength(200)] public string? Description { get; set; }
    [MaxLength(200)] public string FromMetal { get; set; } = string.Empty;
    [Range(0, 1_000_000)] public decimal FromWeight { get; set; }
    [Required, MaxLength(200)] public string ToMetal { get; set; } = string.Empty;
    [Range(0, 1_000_000)] public decimal Weight { get; set; }
    [Range(1, 1_000_000)] public int Qty { get; set; } = 1;
    [Range(0, double.MaxValue)] public decimal MetalRate { get; set; }
    [MaxLength(10)] public string LabourType { get; set; } = Entities.LabourType.PerGram;
    [Range(0, double.MaxValue)] public decimal LabourRate { get; set; }
    [Range(0, 1_000_000)] public decimal DiamondCt { get; set; }
    [Range(0, double.MaxValue)] public decimal DiamondRate { get; set; }
    [Range(0, double.MaxValue)] public decimal StoneAmount { get; set; }
    [Range(0, double.MaxValue)] public decimal OtherCharges { get; set; }
    [Range(0, double.MaxValue)] public decimal CadCharge { get; set; }
    [Range(0, 100)] public decimal GstPercent { get; set; }

    /// <summary>Filled in by the server on the way out: metal value, labour, taxable, GST and total for the line.</summary>
    public decimal MetalAmount { get; set; }
    public decimal LabourAmount { get; set; }
    public decimal DiamondAmount { get; set; }
    public decimal Taxable { get; set; }
    public decimal Gst { get; set; }
    public decimal Total { get; set; }
}

public class QuotationRequest
{
    [Required] public DateOnly QuotationDate { get; set; }
    [Required, MaxLength(100)] public string Branch { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string CustomerName { get; set; } = string.Empty;
    [MaxLength(20)] public string? ContactNo { get; set; }
    [MaxLength(20)] public string Status { get; set; } = QuotationStatus.Open;
    [MaxLength(500)] public string? Notes { get; set; }
    [Range(0, double.MaxValue)] public decimal Advance { get; set; }
    public List<QuotationLineDto> Lines { get; set; } = new();
}

public record QuotationDto(
    int Id, string QuotationNo, DateOnly QuotationDate, string Branch, string CustomerName, string? ContactNo,
    string Status, string? Notes, DateTime CreatedAt, string? CreatedBy, List<QuotationLineDto> Lines,
    decimal Taxable, decimal Gst, decimal GrandTotal, decimal Advance, decimal Balance);

// ---------- Customer orders ----------

public class OrderRequest
{
    [MaxLength(100)] public string? Branch { get; set; }
    [Required, MaxLength(200)] public string ClientName { get; set; } = string.Empty;
    [MaxLength(20)] public string? ContactNo { get; set; }
    [Required] public DateOnly ClientOrderDate { get; set; }
    public DateOnly? OrderPlacedDate { get; set; }
    public DateOnly? CadConfirmedDate { get; set; }
    public DateOnly? DeliveryDate { get; set; }
    public DateOnly? CompletedDate { get; set; }
    [Required, MaxLength(200)] public string Description { get; set; } = string.Empty;
    [MaxLength(50)] public string? DesignRef { get; set; }
    [MaxLength(200)] public string? MetalType { get; set; }
    [MaxLength(200)] public string? DiamondType { get; set; }
    [Range(1, 1_000_000)] public int Qty { get; set; } = 1;
    [MaxLength(200)] public string? Manufacturer { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "Pending";
    [MaxLength(500)] public string? Notes { get; set; }
    [MaxLength(30)] public string? QuotationNo { get; set; }
    [Range(0, double.MaxValue)] public decimal Amount { get; set; }
    [Range(0, double.MaxValue)] public decimal Advance { get; set; }
    [MaxLength(4_000_000)] public string? Photo { get; set; }
}

public record OrderDto(
    int Id, string OrderNo, string Branch, string ClientName, string? ContactNo, DateOnly ClientOrderDate,
    DateOnly? OrderPlacedDate, DateOnly? CadConfirmedDate, DateOnly? DeliveryDate, DateOnly? CompletedDate,
    string Description, string? DesignRef, string? MetalType, string? DiamondType, int Qty, string? Manufacturer,
    string Status, string? Notes, string? QuotationNo, decimal Amount, decimal Advance, string? Photo,
    DateTime CreatedAt, string? CreatedBy);
