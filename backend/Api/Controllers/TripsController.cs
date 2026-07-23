using System.Security.Claims;
using Api.Data;
using Api.Dtos;
using Api.Entities;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/trips")]
[Authorize]
public class TripsController(AppDbContext db, OnePagerService onePagerService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TripDto>>> GetAll([FromQuery] string? q, [FromQuery] Guid? personId, [FromQuery] string? project)
    {
        var query = db.Trips
            .Include(t => t.DestinationCity)
            .Include(t => t.Travellers)
            .Include(t => t.Meetings).ThenInclude(m => m.Contact)
            .Include(t => t.Meetings).ThenInclude(m => m.Attendees)
            .Include(t => t.Meetings).ThenInclude(m => m.Materials).ThenInclude(m => m.OwnerPerson)
            .AsQueryable();

        if (personId is not null)
            query = query.Where(t => t.Travellers.Any(p => p.Id == personId) || t.Meetings.Any(m => m.Attendees.Any(a => a.Id == personId)));
        if (!string.IsNullOrWhiteSpace(project))
            query = query.Where(t => t.Project == project);

        var trips = await query.OrderBy(t => t.FromDate == null).ThenBy(t => t.FromDate).ToListAsync();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim().ToLower();
            trips = trips.Where(t =>
                (t.Project?.ToLower().Contains(needle) ?? false) ||
                (t.Entity?.ToLower().Contains(needle) ?? false) ||
                t.DestinationCity!.Label.ToLower().Contains(needle) ||
                t.Meetings.Any(m => m.Contact!.Name.ToLower().Contains(needle) || m.Agenda.ToLower().Contains(needle))
            ).ToList();
        }

        return Ok(trips.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TripDto>> Get(Guid id)
    {
        var trip = await LoadTripAsync(id);
        return trip is null ? NotFound() : Ok(ToDto(trip));
    }

    [HttpPost]
    public async Task<ActionResult<TripDto>> Create(CreateTripRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.DestinationLabel))
            return BadRequest(new { error = "Destination is required" });
        if (req.FromDate is not null && req.ToDate is not null && req.ToDate < req.FromDate)
            return BadRequest(new { error = "Return/To date can't be before the departure/From date" });

        var city = await GetOrCreateCityAsync(req.DestinationLabel);
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var trip = new Trip
        {
            Project = req.Project ?? "",
            Entity = req.Entity ?? "",
            DestinationCityId = city.Id,
            FromDate = req.FromDate,
            ToDate = req.ToDate,
            Status = req.Status,
            Hotel = req.Hotel ?? "",
            Transport = req.Transport ?? "",
            CreatedBy = userId
        };

        if (req.TravellerIds is { Count: > 0 })
        {
            var travellers = await db.People.Where(p => req.TravellerIds.Contains(p.Id)).ToListAsync();
            foreach (var t in travellers) trip.Travellers.Add(t);
        }

        db.Trips.Add(trip);
        await db.SaveChangesAsync();

        var loaded = await LoadTripAsync(trip.Id);
        return Ok(ToDto(loaded!));
    }

    [HttpPost("bulk")]
    public async Task<ActionResult<List<TripDto>>> CreateBulk(BulkTripRequest req)
    {
        var valid = req.Rows.Where(r => !string.IsNullOrWhiteSpace(r.DestinationLabel)).ToList();
        if (valid.Count == 0)
            return BadRequest(new { error = "Add at least one row with a destination city" });

        var created = new List<Trip>();
        foreach (var row in valid)
        {
            var city = await GetOrCreateCityAsync(row.DestinationLabel);
            var to = (row.FromDate is not null && row.ToDate is not null && row.ToDate < row.FromDate) ? row.FromDate : row.ToDate;
            var trip = new Trip
            {
                Project = row.Project ?? "",
                Entity = row.Entity ?? "",
                DestinationCityId = city.Id,
                FromDate = row.FromDate,
                ToDate = to,
                Status = row.Status
            };
            db.Trips.Add(trip);
            created.Add(trip);
        }
        await db.SaveChangesAsync();

        var ids = created.Select(t => t.Id).ToList();
        var loaded = await db.Trips
            .Include(t => t.DestinationCity).Include(t => t.Travellers)
            .Include(t => t.Meetings).ThenInclude(m => m.Contact)
            .Include(t => t.Meetings).ThenInclude(m => m.Attendees)
            .Include(t => t.Meetings).ThenInclude(m => m.Materials).ThenInclude(m => m.OwnerPerson)
            .Where(t => ids.Contains(t.Id)).ToListAsync();
        return Ok(loaded.Select(ToDto));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<TripDto>> Update(Guid id, UpdateTripRequest req)
    {
        var trip = await db.Trips.Include(t => t.DestinationCity).FirstOrDefaultAsync(t => t.Id == id);
        if (trip is null) return NotFound();

        if (req.Project is not null) trip.Project = req.Project;
        if (req.Entity is not null) trip.Entity = req.Entity;
        if (req.Hotel is not null) trip.Hotel = req.Hotel;
        if (req.Transport is not null) trip.Transport = req.Transport;
        if (req.Status is not null) trip.Status = req.Status.Value;
        if (req.FromDate is not null) trip.FromDate = req.FromDate;
        if (req.ToDate is not null) trip.ToDate = req.ToDate;
        if (req.DestinationLabel is not null)
        {
            var city = await GetOrCreateCityAsync(req.DestinationLabel);
            trip.DestinationCityId = city.Id;
        }

        if (trip.FromDate is not null && trip.ToDate is not null && trip.ToDate < trip.FromDate)
            return BadRequest(new { error = "Return/To date can't be before the departure/From date" });

        trip.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        var loaded = await LoadTripAsync(id);
        return Ok(ToDto(loaded!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var trip = await db.Trips.FindAsync(id);
        if (trip is null) return NotFound();
        db.Trips.Remove(trip);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}/travellers")]
    public async Task<ActionResult<TripDto>> SetTravellers(Guid id, SetTravellersRequest req)
    {
        var trip = await db.Trips.Include(t => t.Travellers).FirstOrDefaultAsync(t => t.Id == id);
        if (trip is null) return NotFound();

        trip.Travellers.Clear();
        var people = await db.People.Where(p => req.PersonIds.Contains(p.Id)).ToListAsync();
        foreach (var p in people) trip.Travellers.Add(p);
        await db.SaveChangesAsync();

        var loaded = await LoadTripAsync(id);
        return Ok(ToDto(loaded!));
    }

    [HttpGet("{id:guid}/one-pager")]
    public async Task<IActionResult> OnePager(Guid id)
    {
        var result = await onePagerService.GetTripOnePagerAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/meetings")]
    public async Task<ActionResult<MeetingDto>> AddMeeting(Guid id, CreateMeetingRequest req)
    {
        var trip = await db.Trips.FindAsync(id);
        if (trip is null) return NotFound();
        var contact = await db.Contacts.FindAsync(req.ContactId);
        if (contact is null) return BadRequest(new { error = "Unknown contact" });

        var meeting = new Meeting
        {
            TripId = id,
            ContactId = req.ContactId,
            OrderNum = req.OrderNum,
            Priority = req.Priority,
            Status = req.Status,
            MeetingTime = req.MeetingTime,
            Project = req.Project,
            Entity = req.Entity,
            Agenda = req.Agenda ?? ""
        };
        if (req.AttendeeIds is { Count: > 0 })
        {
            var attendees = await db.People.Where(p => req.AttendeeIds.Contains(p.Id)).ToListAsync();
            foreach (var a in attendees) meeting.Attendees.Add(a);
        }

        db.Meetings.Add(meeting);
        await db.SaveChangesAsync();

        var loaded = await db.Meetings.Include(m => m.Contact).Include(m => m.Attendees).Include(m => m.Materials)
            .ThenInclude(mat => mat.OwnerPerson).FirstAsync(m => m.Id == meeting.Id);
        return Ok(ToMeetingDto(loaded));
    }

    [HttpDelete("{id:guid}/meetings/{meetingId:guid}")]
    public async Task<IActionResult> RemoveMeeting(Guid id, Guid meetingId)
    {
        var meeting = await db.Meetings.FirstOrDefaultAsync(m => m.Id == meetingId && m.TripId == id);
        if (meeting is null) return NotFound();
        db.Meetings.Remove(meeting);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Task<City> GetOrCreateCityAsync(string label) => CityResolver.GetOrCreateAsync(db, label);

    private async Task<Trip?> LoadTripAsync(Guid id) => await db.Trips
        .Include(t => t.DestinationCity).Include(t => t.Travellers)
        .Include(t => t.Meetings).ThenInclude(m => m.Contact)
        .Include(t => t.Meetings).ThenInclude(m => m.Attendees)
        .Include(t => t.Meetings).ThenInclude(m => m.Materials).ThenInclude(m => m.OwnerPerson)
        .FirstOrDefaultAsync(t => t.Id == id);

    internal static TripDto ToDto(Trip t) => new(
        t.Id, t.Project, t.Entity, t.DestinationCityId, t.DestinationCity!.Label,
        t.FromDate, t.ToDate, t.Status, t.Hotel, t.Transport,
        t.Travellers.Select(p => p.Id).ToList(), t.Travellers.Select(p => p.FullName).ToList(),
        t.Meetings.OrderBy(m => m.OrderNum).Select(ToMeetingDto).ToList());

    internal static MeetingDto ToMeetingDto(Meeting m) => new(
        m.Id, m.ContactId, m.Contact!.Name, m.OrderNum, m.Priority, m.Status, m.MeetingTime,
        m.Project, m.Entity, m.Agenda,
        m.Attendees.Select(a => a.Id).ToList(), m.Attendees.Select(a => a.FullName).ToList(),
        m.Materials.Select(mat => new MaterialDto(mat.Id, mat.Description, mat.OwnerPersonId, mat.OwnerPerson?.FullName)).ToList());
}
