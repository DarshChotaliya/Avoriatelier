using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Auth;
using Purchase.Api.Data;
using Purchase.Api.Entities;

namespace Purchase.Api.Services;

public class LoginRequest
{
    [Required, MaxLength(50)] public string Username { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string Password { get; set; } = string.Empty;
}

public class SetupRequest
{
    [Required, MaxLength(50)] public string Username { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string FullName { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string Password { get; set; } = string.Empty;
}

public class UserSaveRequest
{
    public int? Id { get; set; }
    [Required, MaxLength(50)] public string Username { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string FullName { get; set; } = string.Empty;
    [Required, MaxLength(20)] public string Role { get; set; } = string.Empty;
    public List<string> Branches { get; set; } = new();
    public bool IsActive { get; set; } = true;

    /// <summary>Required for a new user; for an existing user a value resets the password.</summary>
    [MaxLength(200)] public string? Password { get; set; }
}

public class ChangePasswordRequest
{
    [Required, MaxLength(200)] public string CurrentPassword { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string NewPassword { get; set; } = string.Empty;
}

public record UserDto(int Id, string Username, string FullName, string Role, List<string> Branches, bool IsActive,
    DateTime? LastLoginAt, DateTime CreatedAt);

public record MeDto(int Id, string Username, string FullName, string Role, IReadOnlyCollection<string> Permissions,
    List<string> Branches);

public interface IUserService
{
    Task<bool> HasUsersAsync(CancellationToken ct);
    Task<AppUser> SetupOwnerAsync(SetupRequest request, CancellationToken ct);
    Task<AppUser> LoginAsync(string username, string password, CancellationToken ct);
    Task<List<UserDto>> GetAllAsync(CancellationToken ct);
    Task<UserDto> SaveAsync(UserSaveRequest request, int currentUserId, CancellationToken ct);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct);
    Task<AppUser?> FindActiveAsync(int id, CancellationToken ct);
}

public class UserService : IUserService
{
    public const int MaxFailedLogins = 5;
    public static readonly TimeSpan LockoutTime = TimeSpan.FromMinutes(15);
    private const string BadLogin = "Wrong username or password.";

    private readonly PurchaseDbContext _db;
    private readonly IPasswordHasher<AppUser> _hasher;

    public UserService(PurchaseDbContext db, IPasswordHasher<AppUser> hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public Task<bool> HasUsersAsync(CancellationToken ct) => _db.Users.AnyAsync(ct);

    /// <summary>Creates the first account (an Owner). Only allowed while there are no users at all.</summary>
    public async Task<AppUser> SetupOwnerAsync(SetupRequest r, CancellationToken ct)
    {
        if (await HasUsersAsync(ct)) throw new BusinessValidationException("Setup is already done. Please sign in.");
        var user = NewUser(r.Username, r.FullName, Roles.Owner, new List<string>());
        SetPassword(user, r.Password);
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<AppUser> LoginAsync(string username, string password, CancellationToken ct)
    {
        var name = Normalize(username);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == name, ct);
        // Same message for unknown user and wrong password, so names cannot be guessed.
        if (user is null || !user.IsActive) throw new BusinessValidationException(BadLogin);

        var now = DateTime.UtcNow;
        if (user.LockedUntil > now)
        {
            var minutes = (int)Math.Ceiling((user.LockedUntil.Value - now).TotalMinutes);
            throw new BusinessValidationException($"Too many wrong passwords. Try again in {minutes} minute(s).");
        }

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (result == PasswordVerificationResult.Failed)
        {
            user.FailedLogins += 1;
            if (user.FailedLogins >= MaxFailedLogins)
            {
                user.FailedLogins = 0;
                user.LockedUntil = now.Add(LockoutTime);
            }
            await _db.SaveChangesAsync(ct);
            throw new BusinessValidationException(BadLogin);
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded) user.PasswordHash = _hasher.HashPassword(user, password);
        user.FailedLogins = 0;
        user.LockedUntil = null;
        user.LastLoginAt = now;
        await _db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<List<UserDto>> GetAllAsync(CancellationToken ct)
    {
        var users = await _db.Users.AsNoTracking().OrderBy(u => u.Id).ToListAsync(ct);
        return users.Select(ToDto).ToList();
    }

    public async Task<UserDto> SaveAsync(UserSaveRequest r, int currentUserId, CancellationToken ct)
    {
        if (!Roles.IsValid(r.Role)) throw new BusinessValidationException("Pick a valid role.");
        var name = Normalize(r.Username);
        if (await _db.Users.AnyAsync(u => u.Username == name && u.Id != (r.Id ?? 0), ct))
            throw new BusinessValidationException($"Username \"{name}\" is already taken.");

        AppUser user;
        if (r.Id is null)
        {
            if (string.IsNullOrEmpty(r.Password)) throw new BusinessValidationException("Set a password for the new user.");
            user = NewUser(r.Username, r.FullName, r.Role, r.Branches);
            user.IsActive = r.IsActive;
            SetPassword(user, r.Password);
            _db.Users.Add(user);
        }
        else
        {
            user = await _db.Users.FirstOrDefaultAsync(u => u.Id == r.Id, ct)
                   ?? throw new BusinessValidationException("This user no longer exists.");

            var losesOwner = user.Role == Roles.Owner && user.IsActive && (r.Role != Roles.Owner || !r.IsActive);
            if (losesOwner && !await _db.Users.AnyAsync(u => u.Id != user.Id && u.Role == Roles.Owner && u.IsActive, ct))
                throw new BusinessValidationException("Keep at least one active Owner, or nobody can manage users.");
            if (user.Id == currentUserId && !r.IsActive)
                throw new BusinessValidationException("You cannot deactivate your own account.");

            var accessChanged = user.Role != r.Role || user.IsActive != r.IsActive
                                || JoinBranches(r.Branches) != (user.Branches ?? string.Empty);
            user.Username = name;
            user.FullName = r.FullName.Trim();
            user.Role = r.Role;
            user.Branches = JoinBranches(r.Branches);
            user.IsActive = r.IsActive;
            user.UpdatedAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(r.Password))
            {
                SetPassword(user, r.Password);
                user.LockedUntil = null;
                user.FailedLogins = 0;
            }
            else if (accessChanged)
            {
                // Signs the user out so the new role / branches apply straight away.
                user.SecurityStamp = Guid.NewGuid();
            }
        }

        await _db.SaveChangesAsync(ct);
        return ToDto(user);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest r, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new BusinessValidationException("Please sign in again.");
        if (_hasher.VerifyHashedPassword(user, user.PasswordHash, r.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new BusinessValidationException("Current password is wrong.");
        SetPassword(user, r.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public Task<AppUser?> FindActiveAsync(int id, CancellationToken ct) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id && u.IsActive, ct);

    public static MeDto ToMe(AppUser u) =>
        new(u.Id, u.Username, u.FullName, u.Role, Roles.PermissionsOf(u.Role), u.BranchList());

    private static UserDto ToDto(AppUser u) =>
        new(u.Id, u.Username, u.FullName, u.Role, u.BranchList(), u.IsActive, u.LastLoginAt, u.CreatedAt);

    private static string Normalize(string username) => username.Trim().ToLowerInvariant();

    private static string JoinBranches(IEnumerable<string> branches) =>
        string.Join(",", branches.Select(b => b.Trim()).Where(b => b.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase));

    private static AppUser NewUser(string username, string fullName, string role, List<string> branches)
    {
        var name = Normalize(username);
        if (name.Length < 3 || !name.All(c => char.IsLetterOrDigit(c) || c is '.' or '_' or '-'))
            throw new BusinessValidationException("Username: at least 3 letters/digits (. _ - allowed), no spaces.");
        if (string.IsNullOrWhiteSpace(fullName)) throw new BusinessValidationException("Full name is required.");
        var now = DateTime.UtcNow;
        return new AppUser
        {
            Username = name, FullName = fullName.Trim(), Role = role, Branches = JoinBranches(branches),
            CreatedAt = now, UpdatedAt = now,
        };
    }

    /// <summary>At least 8 characters with a letter and a digit; changing it signs the user out elsewhere.</summary>
    private void SetPassword(AppUser user, string password)
    {
        if (password.Length < 8 || !password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            throw new BusinessValidationException("Password needs at least 8 characters, with letters and numbers.");
        user.PasswordHash = _hasher.HashPassword(user, password);
        user.SecurityStamp = Guid.NewGuid();
    }
}
