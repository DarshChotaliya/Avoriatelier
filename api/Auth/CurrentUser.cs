using System.Security.Claims;

namespace Purchase.Api.Auth;

/// <summary>The signed-in user as services see it: name, permissions and which branches they may use.</summary>
public interface ICurrentUser
{
    string Username { get; }
    bool Has(string permission);

    /// <summary>Branches this user may see and change; null means every branch.</summary>
    IReadOnlyCollection<string>? AllowedBranches { get; }
}

public static class CurrentUserExtensions
{
    public static bool CanUseBranch(this ICurrentUser user, string branch) =>
        user.AllowedBranches is null || user.AllowedBranches.Contains(branch, StringComparer.OrdinalIgnoreCase);
}

public static class AuthClaims
{
    public const string UserId = "uid";
    public const string Role = ClaimTypes.Role;
    public const string Branches = "branches";
    public const string Stamp = "stamp";
}

/// <summary>Reads the current request's cookie identity.</summary>
public class HttpCurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _http;

    public HttpCurrentUser(IHttpContextAccessor http)
    {
        _http = http;
    }

    private ClaimsPrincipal? Principal => _http.HttpContext?.User;

    public string Username => Principal?.Identity?.Name ?? "system";

    public bool Has(string permission) =>
        Principal?.FindFirstValue(AuthClaims.Role) is { } role && Roles.Has(role, permission);

    public IReadOnlyCollection<string>? AllowedBranches
    {
        get
        {
            var value = Principal?.FindFirstValue(AuthClaims.Branches);
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }
    }
}

/// <summary>Full access, for start-up seeding and tests.</summary>
public class SystemUser : ICurrentUser
{
    public SystemUser(string username = "system", IReadOnlyCollection<string>? branches = null,
        string role = Roles.Owner)
    {
        Username = username;
        AllowedBranches = branches;
        Role = role;
    }

    public string Role { get; }
    public string Username { get; }
    public IReadOnlyCollection<string>? AllowedBranches { get; }
    public bool Has(string permission) => Roles.Has(Role, permission);
}
