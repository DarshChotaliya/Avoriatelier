using System.ComponentModel.DataAnnotations;
using Purchase.Api.Entities;

namespace Purchase.Api.Dtos;

// ---------- Requests ----------

public class PurchaseRequest
{
    [MaxLength(30)]
    public string? PurchaseNo { get; set; }

    [Required]
    public DateOnly PurchaseDate { get; set; }

    [Required, MaxLength(200)]
    public string SupplierName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? InvoiceNo { get; set; }

    [Required, EnumDataType(typeof(PurchaseType))]
    public PurchaseType PurchaseType { get; set; }

    [Required, MaxLength(30)]
    public string PaymentType { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Remarks { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Discount { get; set; }

    [Range(0, 100)]
    public decimal CgstPercent { get; set; }

    [Range(0, 100)]
    public decimal SgstPercent { get; set; }

    [Range(0, 100)]
    public decimal IgstPercent { get; set; }

    public List<DiamondItemRequest> DiamondItems { get; set; } = new();
    public List<GoldItemRequest> GoldItems { get; set; } = new();
    public List<SilverItemRequest> SilverItems { get; set; } = new();
}

public class DiamondItemRequest
{
    [MaxLength(50)] public string? PacketLotNo { get; set; }
    [MaxLength(50)] public string? Shape { get; set; }
    [Range(0.001, 1_000_000)] public decimal Carat { get; set; }
    [MaxLength(50)] public string? Color { get; set; }
    [MaxLength(50)] public string? Clarity { get; set; }
    [MaxLength(50)] public string? Cut { get; set; }
    [MaxLength(50)] public string? Polish { get; set; }
    [MaxLength(50)] public string? Symmetry { get; set; }
    [MaxLength(50)] public string? Fluorescence { get; set; }
    [MaxLength(50)] public string? CertificateNo { get; set; }
    public DateOnly? CertificateDate { get; set; }
    [Range(0, int.MaxValue)] public int Quantity { get; set; }
    [Range(0, double.MaxValue)] public decimal RatePerCarat { get; set; }
    [Range(0, 100)] public decimal DiscountPercent { get; set; }
}

public class GoldItemRequest
{
    [MaxLength(50)] public string? GoldType { get; set; }
    [Required, MaxLength(10)] public string Purity { get; set; } = string.Empty;
    [Range(0.001, 1_000_000)] public decimal GrossWeight { get; set; }
    [Range(0, 1_000_000)] public decimal StoneWeight { get; set; }
    [Range(0, 100)] public decimal WastagePercent { get; set; }
    [Range(0, double.MaxValue)] public decimal RatePerGram { get; set; }
    [Range(0, double.MaxValue)] public decimal MakingCharges { get; set; }
    [Range(0, double.MaxValue)] public decimal OtherCharges { get; set; }
}

public class SilverItemRequest
{
    [MaxLength(50)] public string? SilverType { get; set; }
    [Required, MaxLength(10)] public string Purity { get; set; } = string.Empty;
    [Range(0.001, 1_000_000)] public decimal GrossWeight { get; set; }
    [Range(0, 1_000_000)] public decimal StoneWeight { get; set; }
    [Range(0, double.MaxValue)] public decimal RatePerGram { get; set; }
    [Range(0, double.MaxValue)] public decimal MakingCharges { get; set; }
    [Range(0, double.MaxValue)] public decimal OtherCharges { get; set; }
}

// ---------- Responses ----------

public record PurchaseListItemDto(
    int Id,
    string PurchaseNo,
    DateOnly PurchaseDate,
    string SupplierName,
    string? InvoiceNo,
    PurchaseType PurchaseType,
    string PaymentType,
    decimal NetPurchaseAmount);

public class PurchaseDto
{
    public int Id { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
    public DateOnly PurchaseDate { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string? InvoiceNo { get; set; }
    public PurchaseType PurchaseType { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    public decimal GrossAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstPercent { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstPercent { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstPercent { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal RoundOff { get; set; }
    public decimal NetPurchaseAmount { get; set; }

    public List<DiamondItemDto> DiamondItems { get; set; } = new();
    public List<GoldItemDto> GoldItems { get; set; } = new();
    public List<SilverItemDto> SilverItems { get; set; } = new();
}

public record DiamondItemDto(
    int Id, string? PacketLotNo, string? Shape, decimal Carat, string? Color, string? Clarity, string? Cut,
    string? Polish, string? Symmetry, string? Fluorescence, string? CertificateNo, DateOnly? CertificateDate,
    int Quantity, decimal RatePerCarat, decimal DiscountPercent, decimal Amount);

public record GoldItemDto(
    int Id, string? GoldType, string Purity, decimal GrossWeight, decimal StoneWeight, decimal NetWeight,
    decimal WastagePercent, decimal WastageWeight, decimal ChargeableWeight, decimal RatePerGram,
    decimal GoldValue, decimal MakingCharges, decimal OtherCharges, decimal Amount);

public record SilverItemDto(
    int Id, string? SilverType, string Purity, decimal GrossWeight, decimal StoneWeight, decimal NetWeight,
    decimal RatePerGram, decimal SilverValue, decimal MakingCharges, decimal OtherCharges, decimal Amount);
