using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Purchase.Api.Auth;
using Purchase.Api.Entities;
using Purchase.Api.Services;

namespace Purchase.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserService _users;

    public AuthController(IUserService users)
    {
        _users = users;
    }

    /// <summary>Whether the first Owner account still has to be created.</summary>
    [AllowAnonymous]
    [HttpGet("status")]
    public async Task<object> Status(CancellationToken ct) => new { needsSetup = !await _users.HasUsersAsync(ct) };

    [AllowAnonymous]
    [HttpPost("setup")]
    public async Task<MeDto> Setup(SetupRequest request, CancellationToken ct)
    {
        var user = await _users.SetupOwnerAsync(request, ct);
        await SignInAsync(user);
        return UserService.ToMe(user);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<MeDto> Login(LoginRequest request, CancellationToken ct)
    {
        var user = await _users.LoginAsync(request.Username, request.Password, ct);
        await SignInAsync(user);
        return UserService.ToMe(user);
    }

    /// <summary>
    /// Sign in with a one-minute pass from the Shivora International staff portal
    /// (Auth/ShivoraSso.cs). 404 while Sso:Secret is not set.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("sso")]
    public async Task<ActionResult<MeDto>> Sso(SsoRequest request, [FromServices] IConfiguration config, CancellationToken ct)
    {
        var secret = config["Sso:Secret"];
        if (string.IsNullOrWhiteSpace(secret)) return NotFound();
        var pass = ShivoraSso.Verify(request.Token, secret, "avori")
            ?? throw new BusinessValidationException("This sign-in link has expired. Please open Avori again from the Shivora portal.");
        var user = await _users.SsoSignInAsync(pass.Usr, ct);
        await SignInAsync(user);
        return UserService.ToMe(user);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeDto>> Me(CancellationToken ct)
    {
        var user = await _users.FindActiveAsync(UserId(), ct);
        return user is null ? Unauthorized() : UserService.ToMe(user);
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await _users.ChangePasswordAsync(UserId(), request, ct);
        // The password change rotated the security stamp; issue a fresh cookie for this browser.
        var user = await _users.FindActiveAsync(UserId(), ct);
        if (user is not null) await SignInAsync(user);
        return NoContent();
    }

    private int UserId() => int.Parse(User.FindFirstValue(AuthClaims.UserId) ?? "0");

    private Task SignInAsync(AppUser user)
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(AuthClaims.UserId, user.Id.ToString()),
            new Claim(AuthClaims.Role, user.Role),
            new Claim(AuthClaims.Branches, user.Branches ?? string.Empty),
            new Claim(AuthClaims.Stamp, user.SecurityStamp.ToString()),
        }, CookieAuthenticationDefaults.AuthenticationScheme);
        return HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true });
    }
}

[ApiController]
[Route("api/users")]
[Authorize(Policy = Permissions.UsersManage)]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;

    public UsersController(IUserService users)
    {
        _users = users;
    }

    [HttpGet]
    public Task<List<UserDto>> GetAll(CancellationToken ct) => _users.GetAllAsync(ct);

    /// <summary>Create (no id) or update (with id); a password on an existing user resets it.</summary>
    [HttpPost]
    public Task<UserDto> Save(UserSaveRequest request, CancellationToken ct) =>
        _users.SaveAsync(request, int.Parse(User.FindFirstValue(AuthClaims.UserId) ?? "0"), ct);

    [HttpGet("roles")]
    public object RolesList() => Roles.All.Select(r => new { role = r, permissions = Roles.PermissionsOf(r) });
}

[ApiController]
[Route("api/stock")]
[Authorize]
public class StockController : ControllerBase
{
    private readonly IStockService _stock;

    public StockController(IStockService stock)
    {
        _stock = stock;
    }

    /// <summary>Every SKU with purchased / available qty (cost only for users who may see it).</summary>
    [HttpGet]
    public Task<List<StockRowDto>> Get(CancellationToken ct) => _stock.GetAsync(ct);
}

public record SsoRequest(string? Token);
