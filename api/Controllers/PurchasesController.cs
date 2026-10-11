using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Purchase.Api.Auth;
using Purchase.Api.Dtos;
using Purchase.Api.Entities;
using Purchase.Api.Services;

namespace Purchase.Api.Controllers;

[ApiController]
[Route("api/purchases")]
[Authorize(Policy = Permissions.PurchaseView)]
public class PurchasesController : ControllerBase
{
    private readonly IPurchaseService _service;

    public PurchasesController(IPurchaseService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<PurchaseListItemDto>>> GetAll(
        [FromQuery] string? search, [FromQuery] PurchaseType? type, CancellationToken ct)
        => await _service.GetAllAsync(search, type, ct);

    [HttpGet("next-number")]
    public async Task<ActionResult<object>> GetNextNumber(CancellationToken ct)
        => new { purchaseNo = await _service.GetNextPurchaseNoAsync(ct) };

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PurchaseDto>> GetById(int id, CancellationToken ct)
    {
        var dto = await _service.GetByIdAsync(id, ct);
        return dto is null ? NotFound() : dto;
    }

    [HttpPost]
    [Authorize(Policy = Permissions.PurchaseEdit)]
    public async Task<ActionResult<PurchaseDto>> Create(PurchaseRequest request, CancellationToken ct)
    {
        var dto = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Permissions.PurchaseEdit)]
    public async Task<ActionResult<PurchaseDto>> Update(int id, PurchaseRequest request, CancellationToken ct)
    {
        var dto = await _service.UpdateAsync(id, request, ct);
        return dto is null ? NotFound() : dto;
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Permissions.PurchaseDelete)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
        => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();
}
