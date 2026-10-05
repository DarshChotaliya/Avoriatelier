using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Purchase.Api.Data;
using Purchase.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Purchase")
    ?? throw new InvalidOperationException("Connection string 'ConnectionStrings:Purchase' is not configured.");

builder.Services.AddDbContext<PurchaseDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

builder.Services.AddScoped<IPurchaseService, PurchaseService>();

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

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
app.MapControllers();

app.Run();
