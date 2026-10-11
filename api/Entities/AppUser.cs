namespace Purchase.Api.Entities;

public class AppUser
{
    public int Id { get; set; }

    /// <summary>Login name, stored lower-case and unique.</summary>
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;

    /// <summary>ASP.NET Core Identity password hash (PBKDF2); the password itself is never stored.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>One of Roles.All.</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Comma-separated branch names this user works in; empty means every branch.</summary>
    public string? Branches { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Changes on password / role / branch / active changes, which signs the user out everywhere.</summary>
    public Guid SecurityStamp { get; set; } = Guid.NewGuid();

    public int FailedLogins { get; set; }
    public DateTime? LockedUntil { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<string> BranchList() =>
        string.IsNullOrWhiteSpace(Branches)
            ? new List<string>()
            : Branches.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
}
