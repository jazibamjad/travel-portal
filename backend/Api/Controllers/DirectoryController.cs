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
public class DirectoryController(AppDbContext db) : ControllerBase
{
    [HttpGet("cities")]
    public async Task<ActionResult<List<CityDto>>> GetCities([FromQuery] string? q)
    {
        var query = db.Cities.Include(c => c.Contacts).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(c => EF.Functions.ILike(c.Label, $"%{q}%"));

        var cities = await query.OrderBy(c => c.Label).ToListAsync();
        return Ok(cities.Select(c => new CityDto(c.Id, c.CityName, c.Country, c.Label, c.Contacts.Count)));
    }

    [HttpPost("cities")]
    public async Task<ActionResult<CityDto>> AddCity(CreateCityRequest req)
    {
        var label = req.Label.Trim();
        if (string.IsNullOrWhiteSpace(label)) return BadRequest(new { error = "City label is required" });
        if (await db.Cities.AnyAsync(c => c.Label == label))
            return Conflict(new { error = "That city already exists" });

        var parts = label.Split(',', 2);
        var city = new City
        {
            CityName = parts[0].Trim(),
            Country = parts.Length > 1 ? parts[1].Trim() : "",
            Label = label
        };
        db.Cities.Add(city);
        await db.SaveChangesAsync();
        return Ok(new CityDto(city.Id, city.CityName, city.Country, city.Label, 0));
    }

    [HttpDelete("cities/{id:guid}")]
    public async Task<IActionResult> DeleteCity(Guid id)
    {
        var city = await db.Cities.Include(c => c.Contacts).FirstOrDefaultAsync(c => c.Id == id);
        if (city is null) return NotFound();

        var referencedByTrip = await db.Trips.AnyAsync(t => t.DestinationCityId == id);
        if (referencedByTrip)
            return Conflict(new { error = "City is used as a trip destination and cannot be removed" });

        var referencedByMeeting = await db.Contacts
            .Where(c => c.CityId == id)
            .AnyAsync(c => c.Meetings.Any());
        if (referencedByMeeting)
            return Conflict(new { error = "City has contacts referenced by existing meetings and cannot be removed" });

        db.Contacts.RemoveRange(city.Contacts);
        db.Cities.Remove(city);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("cities/{id:guid}/contacts")]
    public async Task<ActionResult<List<ContactDto>>> GetContacts(Guid id)
    {
        var contacts = await db.Contacts.Where(c => c.CityId == id).OrderBy(c => c.Name).ToListAsync();
        return Ok(contacts.Select(c => new ContactDto(c.Id, c.CityId, c.Name, c.OrgRole, c.Email)));
    }

    [HttpPost("cities/{id:guid}/contacts")]
    public async Task<ActionResult<ContactDto>> AddContact(Guid id, CreateContactRequest req)
    {
        var cityExists = await db.Cities.AnyAsync(c => c.Id == id);
        if (!cityExists) return NotFound();
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Contact name is required" });

        var contact = new Contact { CityId = id, Name = req.Name.Trim(), OrgRole = req.OrgRole?.Trim() ?? "", Email = req.Email };
        db.Contacts.Add(contact);
        await db.SaveChangesAsync();
        return Ok(new ContactDto(contact.Id, contact.CityId, contact.Name, contact.OrgRole, contact.Email));
    }

    [HttpDelete("contacts/{id:guid}")]
    public async Task<IActionResult> DeleteContact(Guid id)
    {
        var contact = await db.Contacts.Include(c => c.Meetings).FirstOrDefaultAsync(c => c.Id == id);
        if (contact is null) return NotFound();

        if (contact.Meetings.Count > 0)
            return Conflict(new { error = "Contact is referenced by an existing meeting and cannot be removed", meetingCount = contact.Meetings.Count });

        db.Contacts.Remove(contact);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
