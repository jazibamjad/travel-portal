using Api.Dtos;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class OverviewController(KpiService kpiService, CalendarService calendarService) : ControllerBase
{
    [HttpGet("overview/kpis")]
    public async Task<ActionResult<KpiResponse>> Kpis() => Ok(await kpiService.GetKpisAsync());

    [HttpGet("calendar")]
    public async Task<ActionResult<CalendarResponse>> Calendar([FromQuery] List<Guid>? personIds) =>
        Ok(await calendarService.GetCalendarAsync(personIds));
}
