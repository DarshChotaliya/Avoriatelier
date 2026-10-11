using Purchase.Api.Entities;

namespace Purchase.Api.Services;

/// <summary>
/// Server-side source of truth for all purchase amounts. The client computes the same values for
/// display, but whatever it sends is ignored and recalculated here.
/// </summary>
public static class PurchaseCalculator
{
    private static decimal Money(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal Weight(decimal v) => Math.Round(v, 3, MidpointRounding.AwayFromZero);

    // Amount = Carat × Rate/Carat, less Discount %; per diamond: Carat ÷ Qty and Amount ÷ Qty
    public static void Calculate(DiamondItem item)
    {
        var baseAmount = item.Carat * item.RatePerCarat;
        item.Amount = Money(baseAmount - baseAmount * item.DiscountPercent / 100m);
        item.AvgWeight = item.Quantity > 0 ? Weight(item.Carat / item.Quantity) : 0m;
        item.AvgPrice = item.Quantity > 0 ? Money(item.Amount / item.Quantity) : 0m;
    }

    // Net = Gross − Stone; Chargeable = Net + Wastage; Gold Value = Chargeable × Rate
    public static void Calculate(GoldItem item)
    {
        item.NetWeight = Weight(item.GrossWeight - item.StoneWeight);
        item.WastageWeight = Weight(item.NetWeight * item.WastagePercent / 100m);
        item.ChargeableWeight = Weight(item.NetWeight + item.WastageWeight);
        item.GoldValue = Money(item.ChargeableWeight * item.RatePerGram);
        item.Amount = Money(item.GoldValue + item.MakingCharges + item.OtherCharges);
    }

    // Net = Gross − Stone/Other; Silver Value = Net × Rate
    public static void Calculate(SilverItem item)
    {
        item.NetWeight = Weight(item.GrossWeight - item.StoneWeight);
        item.SilverValue = Money(item.NetWeight * item.RatePerGram);
        item.Amount = Money(item.SilverValue + item.MakingCharges + item.OtherCharges);
    }

    public static void CalculateTotals(PurchaseHeader p)
    {
        p.DiamondItems.ForEach(Calculate);
        p.GoldItems.ForEach(Calculate);
        p.SilverItems.ForEach(Calculate);

        p.GrossAmount = p.PurchaseType switch
        {
            PurchaseType.Diamond => p.DiamondItems.Sum(i => i.Amount),
            PurchaseType.Gold => p.GoldItems.Sum(i => i.Amount),
            PurchaseType.Silver => p.SilverItems.Sum(i => i.Amount),
            _ => 0m
        };

        p.TaxableAmount = Money(p.GrossAmount - p.Discount);
        p.CgstAmount = Money(p.TaxableAmount * p.CgstPercent / 100m);
        p.SgstAmount = Money(p.TaxableAmount * p.SgstPercent / 100m);
        p.IgstAmount = Money(p.TaxableAmount * p.IgstPercent / 100m);

        var total = p.TaxableAmount + p.CgstAmount + p.SgstAmount + p.IgstAmount;
        p.NetPurchaseAmount = Math.Round(total, 0, MidpointRounding.AwayFromZero);
        p.RoundOff = p.NetPurchaseAmount - total;
    }
}
