using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Purchase.Api.Auth;
using Purchase.Api.Entities;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Data;
using Purchase.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Purchase")
    ?? throw new InvalidOperationException("Connection string 'ConnectionStrings:Purchase' is not configured.");

builder.Services.AddDbContext<PurchaseDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

builder.Services.AddScoped<IPurchaseService, PurchaseService>();
builder.Services.AddScoped<IMasterService, MasterService>();
builder.Services.AddScoped<IPurchaseInvoiceService, PurchaseInvoiceService>();
builder.Services.AddScoped<ISalesInvoiceService, SalesInvoiceService>();
builder.Services.AddScoped<IQuotationService, QuotationService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IMetalRateService, MetalRateService>();
builder.Services.AddScoped<IProductTagService, ProductTagService>();
builder.Services.AddScoped<ISkuService, SkuService>();
builder.Services.AddScoped<IStockService, StockService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();

// Sign-in: HttpOnly cookie (not readable by page scripts), SameSite=Strict against cross-site requests.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.Name = "avori.auth";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Strict;
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        o.ExpireTimeSpan = TimeSpan.FromHours(12);
        o.SlidingExpiration = true;
        // An API answers 401 / 403 instead of redirecting to a login page.
        o.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        o.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
        // Sign the user out at once when they are deactivated or their password / role / branches change.
        o.Events.OnValidatePrincipal = async ctx =>
        {
            var principal = ctx.Principal!;
            var users = ctx.HttpContext.RequestServices.GetRequiredService<IUserService>();
            var user = int.TryParse(principal.FindFirstValue(AuthClaims.UserId), out var id)
                ? await users.FindActiveAsync(id, ctx.HttpContext.RequestAborted)
                : null;
            if (user is null
                || user.SecurityStamp.ToString() != principal.FindFirstValue(AuthClaims.Stamp)
                || user.Role != principal.FindFirstValue(AuthClaims.Role)
                || (user.Branches ?? string.Empty) != principal.FindFirstValue(AuthClaims.Branches))
            {
                ctx.RejectPrincipal();
                await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            }
        };
    });

builder.Services.AddAuthorization(o =>
{
    // Every permission is a policy: allowed when the signed-in user's role grants it.
    foreach (var permission in Permissions.All)
    {
        o.AddPolicy(permission, p => p.RequireAuthenticatedUser().RequireAssertion(ctx =>
            Roles.Has(ctx.User.FindFirstValue(AuthClaims.Role) ?? string.Empty, permission)));
    }
    // Endpoints without their own rule still need a signed-in user.
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Bring the database up to date and fill empty master lists on every start (development and server), so a fresh
// checkout or a `git pull` with new migrations just runs. Set Database:MigrateOnStartup=false to do it by hand.
if (app.Configuration.GetValue("Database:MigrateOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<PurchaseDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        await ErpSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Could not migrate or seed the database. Check ConnectionStrings:Purchase.");
    }
}

// Behind Nginx on the server: take the real scheme (https) and client address from its X-Forwarded-* headers, so the
// sign-in cookie is marked Secure when the site is served over HTTPS.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});

// Consistent error shape (RFC 7807 problem details); stack traces are never sent to the client.
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var problems = context.RequestServices.GetRequiredService<IProblemDetailsService>();

    if (error is BusinessValidationException)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await problems.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = { Title = "Validation failed", Detail = error.Message, Status = 400 }
        });
        return;
    }

    app.Logger.LogError(error, "Unhandled exception for {Path}", context.Request.Path);
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await problems.WriteAsync(new ProblemDetailsContext
    {
        HttpContext = context,
        ProblemDetails = { Title = "An unexpected error occurred.", Status = 500 }
    });
}));

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
