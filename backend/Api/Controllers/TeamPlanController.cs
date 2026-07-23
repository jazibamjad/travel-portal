using Api.Data;
using Api.Dtos;
using Api.Entities;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/team-plan")]
[Authorize]
public class TeamPlanController(AppDbContext db, CityResolver cityResolver) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TeamPlanEntryDto>>> GetAll([FromQuery] Guid? personId)
    {
        var query = db.TeamPlanEntries.Include(t => t.Person).Include(t => t.City).AsQueryable();
        if (personId is not null) query = query.Where(t => t.PersonId == personId);
        var rows = await query.OrderBy(t => t.FromDate == null).ThenBy(t => t.FromDate).ToListAsync();
        return Ok(rows.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<TeamPlanEntryDto>> Create(CreateTeamPlanEntryRequest req)
    {
        if (req.FromDate is not null && req.ToDate is not null && req.ToDate < req.FromDate)
            return BadRequest(new { error = "Return/To date can't be before the departure/From date" });

        var personExists = await db.People.AnyAsync(p => p.Id == req.PersonId);
        if (!personExists) return BadRequest(new { error = "Unknown person" });

        City? city = string.IsNullOrWhiteSpace(req.CityLabel) ? null : await cityResolver.GetOrCreateAsync(req.CityLabel);

        var entry = new TeamPlanEntry
        {
            PersonId = req.PersonId,
            FromDate = req.FromDate,
            ToDate = req.ToDate,
            CityId = city?.Id,
            Type = req.Type,
            Notes = req.Notes ?? "",
            ApprovalStatus = req.Type == PlanEntryType.Vacation ? Entities.ApprovalStatus.Pending : null
        };
        db.TeamPlanEntries.Add(entry);
        await db.SaveChangesAsync();

        var loaded = await db.TeamPlanEntries.Include(t => t.Person).Include(t => t.City).FirstAsync(t => t.Id == entry.Id);
        return Ok(ToDto(loaded));
    }

    [HttpPost("bulk")]
    public async Task<ActionResult<List<TeamPlanEntryDto>>> CreateBulk(BulkTeamPlanRequest req)
    {
        if (req.PersonIds.Count == 0) return BadRequest(new { error = "Tick at least one person" });
        if (req.FromDate is not null && req.ToDate is not null && req.ToDate < req.FromDate)
            return BadRequest(new { error = "Return/To date can't be before the departure/From date" });

        City? city = string.IsNullOrWhiteSpace(req.CityLabel) ? null : await cityResolver.GetOrCreateAsync(req.CityLabel);
        var validPersonIds = await db.People.Where(p => req.PersonIds.Contains(p.Id)).Select(p => p.Id).ToListAsync();

        var created = new List<TeamPlanEntry>();
        foreach (var personId in validPersonIds)
        {
            var entry = new TeamPlanEntry
            {
                PersonId = personId,
                FromDate = req.FromDate,
                ToDate = req.ToDate,
                CityId = city?.Id,
                Type = req.Type,
                Notes = req.Notes ?? "",
                ApprovalStatus = req.Type == PlanEntryType.Vacation ? Entities.ApprovalStatus.Pending : null
            };
            db.TeamPlanEntries.Add(entry);
            created.Add(entry);
        }
        await db.SaveChangesAsync();

        var ids = created.Select(c => c.Id).ToList();
        var loaded = await db.TeamPlanEntries.Include(t => t.Person).Include(t => t.City).Where(t => ids.Contains(t.Id)).ToListAsync();
        return Ok(loaded.Select(ToDto));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<TeamPlanEntryDto>> Update(Guid id, UpdateTeamPlanEntryRequest req)
    {
        var entry = await db.TeamPlanEntries.Include(t => t.Person).Include(t => t.City).FirstOrDefaultAsync(t => t.Id == id);
        if (entry is null) return NotFound();

        if (req.FromDate is not null) entry.FromDate = req.FromDate;
        if (req.ToDate is not null) entry.ToDate = req.ToDate;
        if (req.Notes is not null) entry.Notes = req.Notes;
        if (req.Type is not null)
        {
            entry.Type = req.Type.Value;
            if (entry.Type == PlanEntryType.Vacation && entry.ApprovalStatus is null)
                entry.ApprovalStatus = Entities.ApprovalStatus.Pending;
            if (entry.Type != PlanEntryType.Vacation)
                entry.ApprovalStatus = null;
        }
        if (req.CityLabel is not null)
        {
            var city = string.IsNullOrWhiteSpace(req.CityLabel) ? null : await cityResolver.GetOrCreateAsync(req.CityLabel);
            entry.CityId = city?.Id;
        }

        if (entry.FromDate is not null && entry.ToDate is not null && entry.ToDate < entry.FromDate)
            return BadRequest(new { error = "Return/To date can't be before the departure/From date" });

        await db.SaveChangesAsync();
        return Ok(ToDto(entry));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entry = await db.TeamPlanEntries.FindAsync(id);
        if (entry is null) return NotFound();
        db.TeamPlanEntries.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Approve/reject a vacation entry. MVP: any signed-in user may decide (see PRD US-7.2
    /// deviation note); once RBAC lands this narrows to the CoordinatorOrCeo policy.</summary>
    [HttpPost("{id:guid}/decision")]
    public async Task<ActionResult<TeamPlanEntryDto>> Decide(Guid id, DecisionRequest req)
    {
        var entry = await db.TeamPlanEntries.Include(t => t.Person).Include(t => t.City).FirstOrDefaultAsync(t => t.Id == id);
        if (entry is null) return NotFound();
        if (entry.Type != PlanEntryType.Vacation)
            return BadRequest(new { error = "Only vacation entries can be approved or rejected" });

        entry.ApprovalStatus = req.Decision;
        entry.DecidedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(entry));
    }

    private static TeamPlanEntryDto ToDto(TeamPlanEntry e) => new(
        e.Id, e.PersonId, e.Person!.FullName, e.FromDate, e.ToDate, e.CityId, e.City?.Label,
        e.Type, e.Notes, e.ApprovalStatus, e.DecidedAt);
}
