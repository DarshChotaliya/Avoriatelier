using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Purchase.Api.Auth;
using Purchase.Api.Dtos;
using Purchase.Api.Services;

namespace Purchase.Api.Controllers;

[ApiController]
[Route("api/masters")]
[Authorize]
public class MastersController : ControllerBase
{
    private readonly IMasterService _service;

    public MastersController(IMasterService service)
    {
        _service = service;
    }

    /// <summary>Every master list in one response. Any signed-in user (the sale form needs branches/customers).</summary>
    [HttpGet]
    public Task<Dictionary<string, object>> GetAll(CancellationToken ct) => _service.GetAllAsync(ct);

    /// <summary>Create (no id) or update (with id) a record of one master kind.</summary>
    [HttpPost("{kind}")]
    [Authorize(Policy = Permissions.MastersEdit)]
    public async Task<ActionResult<object>> Save(string kind, JsonElement record, CancellationToken ct)
        => Ok(await _service.SaveAsync(kind, record, ct));

    [HttpDelete("{kind}/{id:int}")]
    [Authorize(Policy = Permissions.MastersEdit)]
    public async Task<IActionResult> Delete(string kind, int id, CancellationToken ct)
        => await _service.DeleteAsync(kind, id, ct) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/purchase-invoices")]
[Authorize(Policy = Permissions.PurchaseView)]
public class PurchaseInvoicesController : ControllerBase
{
    private readonly IPurchaseInvoiceService _service;

    public PurchaseInvoicesController(IPurchaseInvoiceService service)
    {
        _service = service;
    }

    [HttpGet]
    public Task<List<PurchaseInvoiceDto>> GetAll(CancellationToken ct) => _service.GetAllAsync(ct);

    [HttpPost]
    [Authorize(Policy = Permissions.PurchaseEdit)]
    public Task<PurchaseInvoiceDto> Create(PurchaseInvoiceRequest request, CancellationToken ct)
        => _service.CreateAsync(request, ct);

    [HttpPut("{id:int}")]
    [Authorize(Policy = Permissions.PurchaseEdit)]
    public async Task<ActionResult<PurchaseInvoiceDto>> Update(int id, PurchaseInvoiceRequest request, CancellationToken ct)
    {
        var dto = await _service.UpdateAsync(id, request, ct);
        return dto is null ? NotFound() : dto;
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Permissions.PurchaseDelete)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
        => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();

    [HttpDelete("{id:int}/items/{itemId:int}")]
    [Authorize(Policy = Permissions.PurchaseDelete)]
    public async Task<IActionResult> DeleteItem(int id, int itemId, CancellationToken ct)
        => await _service.DeleteItemAsync(id, itemId, ct) ? NoContent() : NotFound();

    [HttpPost("skus/{sku}/rename")]
    [Authorize(Policy = Permissions.PurchaseEdit)]
    public async Task<ActionResult<object>> RenameSku(string sku, RenameSkuRequest request, CancellationToken ct)
        => new { skuNo = await _service.RenameSkuAsync(sku, request.NewSku, ct) };
}

[ApiController]
[Route("api/sales-invoices")]
[Authorize(Policy = Permissions.SalesView)]
public class SalesInvoicesController : ControllerBase
{
    private readonly ISalesInvoiceService _service;

    public SalesInvoicesController(ISalesInvoiceService service)
    {
        _service = service;
    }

    [HttpGet]
    public Task<List<SalesInvoiceDto>> GetAll(CancellationToken ct) => _service.GetAllAsync(ct);

    [HttpGet("next-number")]
    [Authorize(Policy = Permissions.SalesCreate)]
    public async Task<object> NextNumber(CancellationToken ct) => new { invoiceNo = await _service.GetNextNumberAsync(ct) };

    [HttpPost]
    [Authorize(Policy = Permissions.SalesCreate)]
    public Task<SalesInvoiceDto> Create(SalesInvoiceRequest request, CancellationToken ct) => _service.CreateAsync(request, ct);

    [HttpPut("{id:int}")]
    [Authorize(Policy = Permissions.SalesCreate)]
    public async Task<ActionResult<SalesInvoiceDto>> Update(int id, SalesInvoiceRequest request, CancellationToken ct)
    {
        var dto = await _service.UpdateAsync(id, request, ct);
        return dto is null ? NotFound() : dto;
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Permissions.SalesDelete)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
        => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/quotations")]
[Authorize(Policy = Permissions.SalesView)]
public class QuotationsController : ControllerBase
{
    private readonly IQuotationService _service;

    public QuotationsController(IQuotationService service)
    {
        _service = service;
    }

    [HttpGet]
    public Task<List<QuotationDto>> GetAll(CancellationToken ct) => _service.GetAllAsync(ct);

    [HttpPost]
    [Authorize(Policy = Permissions.SalesCreate)]
    public Task<QuotationDto> Create(QuotationRequest request, CancellationToken ct) => _service.CreateAsync(request, ct);

    [HttpPut("{id:int}")]
    [Authorize(Policy = Permissions.SalesCreate)]
    public async Task<ActionResult<QuotationDto>> Update(int id, QuotationRequest request, CancellationToken ct)
    {
        var dto = await _service.UpdateAsync(id, request, ct);
        return dto is null ? NotFound() : dto;
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Permissions.SalesDelete)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
        => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/orders")]
[Authorize(Policy = Permissions.SalesView)]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _service;

    public OrdersController(IOrderService service)
    {
        _service = service;
    }

    [HttpGet]
    public Task<List<OrderDto>> GetAll(CancellationToken ct) => _service.GetAllAsync(ct);

    [HttpPost]
    [Authorize(Policy = Permissions.SalesCreate)]
    public Task<OrderDto> Create(OrderRequest request, CancellationToken ct) => _service.CreateAsync(request, ct);

    [HttpPut("{id:int}")]
    [Authorize(Policy = Permissions.SalesCreate)]
    public async Task<ActionResult<OrderDto>> Update(int id, OrderRequest request, CancellationToken ct)
    {
        var dto = await _service.UpdateAsync(id, request, ct);
        return dto is null ? NotFound() : dto;
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Permissions.SalesDelete)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
        => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();
}

/// <summary>Today's gold / silver / platinum 999 rates for quotations (Masters → Metal Types).</summary>
[ApiController]
[Route("api/metal-rates")]
[Authorize]
public class MetalRatesController : ControllerBase
{
    private readonly IMetalRateService _service;

    public MetalRatesController(IMetalRateService service)
    {
        _service = service;
    }

    [HttpGet]
    public Task<List<MetalRateDto>> Get(CancellationToken ct) => _service.GetAsync(ct);

    [HttpPut]
    [Authorize(Policy = Permissions.MastersEdit)]
    public Task<List<MetalRateDto>> Save(MetalRatesRequest request, CancellationToken ct) => _service.SaveAsync(request, ct);
}

/// <summary>Product page behind a QR tag: anyone who scans it may open it (it holds no private figures).</summary>
[ApiController]
[Route("api/public/products")]
[AllowAnonymous]
public class ProductTagsController : ControllerBase
{
    private readonly IProductTagService _service;

    public ProductTagsController(IProductTagService service)
    {
        _service = service;
    }

    [HttpGet("{sku}")]
    public async Task<ActionResult<ProductTagDto>> Get(string sku, CancellationToken ct)
    {
        var dto = await _service.GetAsync(sku, ct);
        return dto is null ? NotFound() : dto;
    }
}

/// <summary>SKU format and counter (SKU Master → Format &amp; Counter Settings).</summary>
[ApiController]
[Route("api/sku-settings")]
[Authorize]
public class SkuSettingsController : ControllerBase
{
    private readonly ISkuService _service;

    public SkuSettingsController(ISkuService service)
    {
        _service = service;
    }

    [HttpGet]
    public Task<SkuSettingDto> Get(CancellationToken ct) => _service.GetAsync(ct);

    [HttpPut]
    [Authorize(Policy = Permissions.PurchaseEdit)]
    public Task<SkuSettingDto> Save(SkuSettingRequest request, CancellationToken ct) => _service.SaveAsync(request, ct);
}
