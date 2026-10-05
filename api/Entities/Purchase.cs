namespace Purchase.Api.Entities;

public enum PurchaseType
{
    Diamond = 1,
    Gold = 2,
    Silver = 3
}

public class PurchaseHeader
{
    public int Id { get; set; }

    // Common purchase details
    public string PurchaseNo { get; set; } = string.Empty;
    public DateOnly PurchaseDate { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string? InvoiceNo { get; set; }
    public PurchaseType PurchaseType { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    // Common tax & total section
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

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<DiamondItem> DiamondItems { get; set; } = new();
    public List<GoldItem> GoldItems { get; set; } = new();
    public List<SilverItem> SilverItems { get; set; } = new();
}

public class DiamondItem
{
    public int Id { get; set; }
    public int PurchaseId { get; set; }
    public PurchaseHeader? Purchase { get; set; }

    public string? PacketLotNo { get; set; }
    public string? Shape { get; set; }
    public decimal Carat { get; set; }
    public string? Color { get; set; }
    public string? Clarity { get; set; }
    public string? Cut { get; set; }
    public string? Polish { get; set; }
    public string? Symmetry { get; set; }
    public string? Fluorescence { get; set; }
    public string? CertificateNo { get; set; }
    public DateOnly? CertificateDate { get; set; }
    public int Quantity { get; set; }
    public decimal RatePerCarat { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal Amount { get; set; }
}

public class GoldItem
{
    public int Id { get; set; }
    public int PurchaseId { get; set; }
    public PurchaseHeader? Purchase { get; set; }

    public string? GoldType { get; set; }
    public string Purity { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    public decimal StoneWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal WastagePercent { get; set; }
    public decimal WastageWeight { get; set; }
    public decimal ChargeableWeight { get; set; }
    public decimal RatePerGram { get; set; }
    public decimal GoldValue { get; set; }
    public decimal MakingCharges { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal Amount { get; set; }
}

public class SilverItem
{
    public int Id { get; set; }
    public int PurchaseId { get; set; }
    public PurchaseHeader? Purchase { get; set; }

    public string? SilverType { get; set; }
    public string Purity { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    public decimal StoneWeight { get; set; }
    public decimal NetWeight { get; set; }
    public decimal RatePerGram { get; set; }
    public decimal SilverValue { get; set; }
    public decimal MakingCharges { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal Amount { get; set; }
}
