namespace Purchase.Api.Auth;

/// <summary>What a user may do. Each permission is also an authorization policy with the same name.</summary>
public static class Permissions
{
    public const string PurchaseView = "purchase.view";
    public const string PurchaseEdit = "purchase.edit";
    public const string PurchaseDelete = "purchase.delete";
    public const string SalesView = "sales.view";
    /// <summary>See every user's sales; without it a user sees only the sales they created.</summary>
    public const string SalesViewAll = "sales.viewAll";
    public const string SalesCreate = "sales.create";
    public const string SalesDelete = "sales.delete";
    public const string InventoryView = "inventory.view";
    public const string CostView = "cost.view";
    public const string MastersView = "masters.view";
    public const string MastersEdit = "masters.edit";
    public const string UsersManage = "users.manage";

    public static readonly string[] All =
    {
        PurchaseView, PurchaseEdit, PurchaseDelete, SalesView, SalesViewAll, SalesCreate, SalesDelete, InventoryView, CostView,
        MastersView, MastersEdit, UsersManage,
    };
}

public static class Roles
{
    public const string Owner = "Owner";
    public const string Manager = "Manager";
    public const string Accountant = "Accountant";
    public const string StoreStaff = "StoreStaff";

    public static readonly string[] All = { Owner, Manager, Accountant, StoreStaff };

    private static readonly Dictionary<string, HashSet<string>> Map = new()
    {
        [Owner] = Permissions.All.ToHashSet(),
        [Manager] = new()
        {
            Permissions.PurchaseView, Permissions.PurchaseEdit, Permissions.SalesView, Permissions.SalesViewAll,
            Permissions.SalesCreate,
            Permissions.SalesDelete, Permissions.InventoryView, Permissions.CostView, Permissions.MastersView,
            Permissions.MastersEdit,
        },
        [Accountant] = new()
        {
            Permissions.PurchaseView, Permissions.SalesView, Permissions.SalesViewAll, Permissions.InventoryView,
            Permissions.CostView, Permissions.MastersView,
        },
        // Sells from the store: only their own sales; no purchase prices, cost or profit.
        [StoreStaff] = new() { Permissions.SalesView, Permissions.SalesCreate, Permissions.InventoryView },
    };

    public static bool IsValid(string role) => Map.ContainsKey(role);

    public static IReadOnlyCollection<string> PermissionsOf(string role) =>
        Map.TryGetValue(role, out var p) ? p : new HashSet<string>();

    public static bool Has(string role, string permission) => Map.TryGetValue(role, out var p) && p.Contains(permission);
}
