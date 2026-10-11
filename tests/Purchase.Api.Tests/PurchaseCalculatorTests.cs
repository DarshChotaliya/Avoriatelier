using Purchase.Api.Entities;
using Purchase.Api.Services;

namespace Purchase.Api.Tests;

public class PurchaseCalculatorTests
{
    [Fact]
    public void Diamond_amount_is_carat_times_rate_less_discount()
    {
        var item = new DiamondItem { Carat = 1.5m, RatePerCarat = 50000m, DiscountPercent = 10m };

        PurchaseCalculator.Calculate(item);

        Assert.Equal(67500m, item.Amount);
    }

    [Fact]
    public void Diamond_parcel_stores_the_average_weight_and_price_of_one_diamond()
    {
        var item = new DiamondItem { Carat = 1.20m, Quantity = 7, RatePerCarat = 50000m };

        PurchaseCalculator.Calculate(item);

        Assert.Equal(60000m, item.Amount);
        Assert.Equal(0.171m, item.AvgWeight);
        Assert.Equal(8571.43m, item.AvgPrice);
    }

    [Fact]
    public void Gold_amount_uses_chargeable_weight_including_wastage()
    {
        var item = new GoldItem
        {
            GrossWeight = 10m, StoneWeight = 0.5m, WastagePercent = 2m, RatePerGram = 6000m,
            MakingCharges = 1000m, OtherCharges = 200m
        };

        PurchaseCalculator.Calculate(item);

        Assert.Equal(9.5m, item.NetWeight);
        Assert.Equal(0.19m, item.WastageWeight);
        Assert.Equal(9.69m, item.ChargeableWeight);
        Assert.Equal(58140m, item.GoldValue);
        Assert.Equal(59340m, item.Amount);
    }

    [Fact]
    public void Silver_amount_is_net_weight_times_rate_plus_charges()
    {
        var item = new SilverItem
        {
            GrossWeight = 100m, StoneWeight = 5m, RatePerGram = 80m, MakingCharges = 500m
        };

        PurchaseCalculator.Calculate(item);

        Assert.Equal(95m, item.NetWeight);
        Assert.Equal(7600m, item.SilverValue);
        Assert.Equal(8100m, item.Amount);
    }

    [Fact]
    public void Totals_apply_discount_gst_and_round_off()
    {
        var purchase = new PurchaseHeader
        {
            PurchaseType = PurchaseType.Gold,
            Discount = 340.33m,
            CgstPercent = 1.5m,
            SgstPercent = 1.5m,
            GoldItems =
            {
                new GoldItem
                {
                    GrossWeight = 10m, StoneWeight = 0.5m, WastagePercent = 2m, RatePerGram = 6000m,
                    MakingCharges = 1000m, OtherCharges = 200m
                }
            }
        };

        PurchaseCalculator.CalculateTotals(purchase);

        Assert.Equal(59340m, purchase.GrossAmount);
        Assert.Equal(58999.67m, purchase.TaxableAmount);
        Assert.Equal(885m, purchase.CgstAmount);
        Assert.Equal(885m, purchase.SgstAmount);
        Assert.Equal(0m, purchase.IgstAmount);
        Assert.Equal(0.33m, purchase.RoundOff);
        Assert.Equal(60770m, purchase.NetPurchaseAmount);
    }

    [Fact]
    public void Gross_amount_only_counts_items_of_selected_type()
    {
        var purchase = new PurchaseHeader
        {
            PurchaseType = PurchaseType.Silver,
            SilverItems = { new SilverItem { GrossWeight = 10m, RatePerGram = 100m } },
            GoldItems = { new GoldItem { GrossWeight = 10m, RatePerGram = 6000m } }
        };

        PurchaseCalculator.CalculateTotals(purchase);

        Assert.Equal(1000m, purchase.GrossAmount);
    }
}
