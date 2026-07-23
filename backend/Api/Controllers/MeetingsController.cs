using Api.Data;
using Api.Dtos;
using Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class MeetingsController(AppDbContext db) : ControllerBase
{
    [HttpPatch("meetings/{id:guid}")]
    public async Task<ActionResult<MeetingDto>> Update(Guid id, UpdateMeetingRequest req)
    {
        var meeting = await LoadAsync(id);
        if (meeting is null) return NotFound();

        if (req.OrderNum is not null) meeting.OrderNum = req.OrderNum.Value;
        if (req.Priority is not null) meeting.Priority = req.Priority.Value;
        if (req.Status is not null) meeting.Status = req.Status.Value;
        if (req.MeetingTime is not null) meeting.MeetingTime = req.MeetingTime;
        if (req.Project is not null) meeting.Project = req.Project;
        if (req.Entity is not null) meeting.Entity = req.Entity;
        if (req.Agenda is not null) meeting.Agenda = req.Agenda;
        if (req.AttendeeIds is not null)
        {
            meeting.Attendees.Clear();
            var attendees = await db.People.Where(p => req.AttendeeIds.Contains(p.Id)).ToListAsync();
            foreach (var a in attendees) meeting.Attendees.Add(a);
        }

        await db.SaveChangesAsync();
        return Ok(TripsController.ToMeetingDto(meeting));
    }

    [HttpPut("meetings/{id:guid}/attendees")]
    public async Task<ActionResult<MeetingDto>> SetAttendees(Guid id, SetTravellersRequest req)
    {
        var meeting = await LoadAsync(id);
        if (meeting is null) return NotFound();

        meeting.Attendees.Clear();
        var attendees = await db.People.Where(p => req.PersonIds.Contains(p.Id)).ToListAsync();
        foreach (var a in attendees) meeting.Attendees.Add(a);
        await db.SaveChangesAsync();
        return Ok(TripsController.ToMeetingDto(meeting));
    }

    [HttpPost("meetings/{id:guid}/materials")]
    public async Task<ActionResult<MaterialDto>> AddMaterial(Guid id, UpsertMaterialRequest req)
    {
        var exists = await db.Meetings.AnyAsync(m => m.Id == id);
        if (!exists) return NotFound();

        var material = new Material { MeetingId = id, Description = req.Description ?? "", OwnerPersonId = req.OwnerPersonId };
        db.Materials.Add(material);
        await db.SaveChangesAsync();

        var ownerName = req.OwnerPersonId is null ? null : (await db.People.FindAsync(req.OwnerPersonId))?.FullName;
        return Ok(new MaterialDto(material.Id, material.Description, material.OwnerPersonId, ownerName));
    }

    [HttpPatch("materials/{id:guid}")]
    public async Task<ActionResult<MaterialDto>> UpdateMaterial(Guid id, UpsertMaterialRequest req)
    {
        var material = await db.Materials.FindAsync(id);
        if (material is null) return NotFound();

        material.Description = req.Description ?? material.Description;
        material.OwnerPersonId = req.OwnerPersonId;
        await db.SaveChangesAsync();

        var ownerName = material.OwnerPersonId is null ? null : (await db.People.FindAsync(material.OwnerPersonId))?.FullName;
        return Ok(new MaterialDto(material.Id, material.Description, material.OwnerPersonId, ownerName));
    }

    [HttpDelete("materials/{id:guid}")]
    public async Task<IActionResult> DeleteMaterial(Guid id)
    {
        var material = await db.Materials.FindAsync(id);
        if (material is null) return NotFound();
        db.Materials.Remove(material);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<Meeting?> LoadAsync(Guid id) => await db.Meetings
        .Include(m => m.Contact).Include(m => m.Attendees)
        .Include(m => m.Materials).ThenInclude(m => m.OwnerPerson)
        .FirstOrDefaultAsync(m => m.Id == id);
}
