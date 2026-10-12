using Purchase.Api.Entities;

namespace Purchase.Api.Services;

/// <summary>
/// Server-side cost of one purchased piece (mirrors src/utils/invoiceCalc.js; the server value is the one stored):
///   Metal   = Net Wt × Metal rate/g
///   Diamond = Σ Wt (ct) × Rate/ct
///   Stone   = Σ per Ct: Wt × Rate · per Cert: Pcs × Rate
///   Labour  = max(Net Wt × Labour/g, Labour minimum)   (0 when there is no net weight)
///   Cost/pc = Metal + Diamond + Stone + Labour + Hallmark + Other
/// </summary>
public static class ErpCalculator
{
    private static decimal Money(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    /// <summary>Hallmarking is a service: its 18% GST comes on top of the item's own GST.</summary>
    public const decimal HallmarkGstPercent = 18m;

    /// <summary>
    /// Purchase price of one piece including GST (mirrors priceWithGst in src/utils/invoiceCalc.js): the item's GST %
    /// on the whole price, hallmark included, plus 18% on the hallmark charge.
    /// </summary>
    public static decimal PriceWithGst(PurchaseInvoiceItem item) =>
        Money(item.Price * (1 + item.GstPercent / 100m) + item.Hallmark * HallmarkGstPercent / 100m);

    public static decimal StoneAmount(PurchaseItemStone s) =>
        Money(s.Pricing == StonePricing.PerCert ? s.Pcs * s.Rate : s.Weight * s.Rate);

    public static decimal DiamondAmount(PurchaseItemDiamond d) => Money(d.Weight * d.Rate);

    /// <summary>Fixed labour is the typed amount as it is; otherwise Net Wt × Labour / g (at least the minimum).</summary>
    public static decimal Labour(PurchaseInvoiceItem item)
    {
        if (item.LabourFixed) return Money(item.LabourRate);
        return item.NetWeight > 0 ? Money(Math.Max(item.NetWeight * item.LabourRate, item.LabourMinimum)) : 0m;
    }

    public static decimal CostPerPiece(PurchaseInvoiceItem item)
    {
        var metal = Money(item.NetWeight * item.MetalRate);
        var diamonds = Money(item.Diamonds.Sum(DiamondAmount));
        var stones = Money(item.Stones.Sum(StoneAmount));
        var labour = Labour(item);
        return Money(metal + diamonds + stones + labour + item.Hallmark + item.OtherCharges);
    }
}
