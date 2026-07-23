using Api.Data;
using Api.Dtos;
using Api.Entities;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ExportImportController(AppDbContext db, CityResolver cityResolver) : ControllerBase
{
    [HttpGet("export")]
    public async Task<ActionResult<ExportBundle>> Export()
    {
        var people = await db.People.ToListAsync();
        var cities = await db.Cities.Include(c => c.Contacts).ToListAsync();
        var trips = await db.Trips
            .Include(t => t.DestinationCity).Include(t => t.Travellers)
            .Include(t => t.Meetings).ThenInclude(m => m.Contact).ThenInclude(c => c!.City)
            .Include(t => t.Meetings).ThenInclude(m => m.Attendees)
            .Include(t => t.Meetings).ThenInclude(m => m.Materials).ThenInclude(m => m.OwnerPerson)
            .ToListAsync();
        var flights = await db.Flights.Include(f => f.TravellerPerson).ToListAsync();
        var teamPlan = await db.TeamPlanEntries.Include(t => t.Person).Include(t => t.City).ToListAsync();

        var bundle = new ExportBundle(
            DateTimeOffset.UtcNow,
            people.Select(p => new ExportPerson(p.FullName, p.Title, p.Function, p.IsCeo)).ToList(),
            cities.Select(c => new ExportCity(c.Label, c.Contacts.Select(ct => new ExportContact(ct.Name, ct.OrgRole, ct.Email)).ToList())).ToList(),
            trips.Select(t => new ExportTrip(
                t.Project, t.Entity, t.DestinationCity!.Label, t.FromDate, t.ToDate, t.Status, t.Hotel, t.Transport,
                t.Travellers.Select(p => p.FullName).ToList(),
                t.Meetings.OrderBy(m => m.OrderNum).Select(m => new ExportMeeting(
                    m.Contact!.Name, m.Contact.City!.Label, m.OrderNum, m.Priority, m.Status, m.MeetingTime,
                    m.Project, m.Entity, m.Agenda, m.Attendees.Select(a => a.FullName).ToList(),
                    m.Materials.Select(mat => new ExportMaterial(mat.Description, mat.OwnerPerson?.FullName)).ToList()
                )).ToList()
            )).ToList(),
            flights.Select(f => new ExportFlight(f.TravellerPerson!.FullName, f.OriginLabel, f.DestinationLabel, f.FlightDateText, f.FlightNo, f.DepartText, f.ArriveText, f.Aircraft)).ToList(),
            teamPlan.Select(e => new ExportTeamPlan(e.Person!.FullName, e.FromDate, e.ToDate, e.City?.Label, e.Type, e.Notes, e.ApprovalStatus)).ToList()
        );

        return Ok(bundle);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import(ExportBundle bundle)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            // People are upserted (never deleted) since login accounts reference them.
            var peopleByName = await db.People.ToDictionaryAsync(p => p.FullName);
            foreach (var ep in bundle.People)
            {
                if (peopleByName.TryGetValue(ep.FullName, out var existing))
                {
                    existing.Title = ep.Title;
                    existing.Function = ep.Function;
                    existing.IsCeo = ep.IsCeo;
                }
                else
                {
                    var p = new Person { FullName = ep.FullName, Title = ep.Title, Function = ep.Function, IsCeo = ep.IsCeo };
                    db.People.Add(p);
                    peopleByName[ep.FullName] = p;
                }
            }
            await db.SaveChangesAsync();

            // Replace everything else wholesale (matches the prototype's import-replaces-plan behavior).
            await db.Trips.ExecuteDeleteAsync();
            await db.Flights.ExecuteDeleteAsync();
            await db.TeamPlanEntries.ExecuteDeleteAsync();
            await db.Contacts.ExecuteDeleteAsync();
            await db.Cities.ExecuteDeleteAsync();

            var cityByLabel = new Dictionary<string, City>();
            foreach (var ec in bundle.Cities)
            {
                var city = new City
                {
                    Label = ec.Label,
                    CityName = ec.Label.Split(',')[0].Trim(),
                    Country = ec.Label.Contains(',') ? ec.Label[(ec.Label.IndexOf(',') + 1)..].Trim() : ""
                };
                foreach (var c in ec.Contacts)
                    city.Contacts.Add(new Contact { Name = c.Name, OrgRole = c.OrgRole, Email = c.Email });
                db.Cities.Add(city);
                cityByLabel[ec.Label] = city;
            }
            await db.SaveChangesAsync();

            var contactByCityAndName = await db.Contacts.Include(c => c.City)
                .ToDictionaryAsync(c => (c.City!.Label, c.Name));

            foreach (var et in bundle.Trips)
            {
                var destCity = cityByLabel.TryGetValue(et.DestinationLabel, out var dc)
                    ? dc
                    : await cityResolver.GetOrCreateAsync(et.DestinationLabel);

                var trip = new Trip
                {
                    Project = et.Project, Entity = et.Entity, DestinationCityId = destCity.Id,
                    FromDate = et.FromDate, ToDate = et.ToDate, Status = et.Status, Hotel = et.Hotel, Transport = et.Transport
                };
                foreach (var name in et.TravellerNames)
                    if (peopleByName.TryGetValue(name, out var person)) trip.Travellers.Add(person);

                foreach (var em in et.Meetings)
                {
                    if (!contactByCityAndName.TryGetValue((em.ContactCityLabel, em.ContactName), out var contact))
                        continue; // orphaned reference in the import file — skip rather than fail the whole import
                    var meeting = new Meeting
                    {
                        ContactId = contact.Id, OrderNum = em.OrderNum, Priority = em.Priority, Status = em.Status,
                        MeetingTime = em.MeetingTime, Project = em.Project, Entity = em.Entity, Agenda = em.Agenda
                    };
                    foreach (var name in em.AttendeeNames)
                        if (peopleByName.TryGetValue(name, out var person)) meeting.Attendees.Add(person);
                    foreach (var mat in em.Materials)
                        meeting.Materials.Add(new Material
                        {
                            Description = mat.Description,
                            OwnerPersonId = mat.OwnerName is not null && peopleByName.TryGetValue(mat.OwnerName, out var owner) ? owner.Id : null
                        });
                    trip.Meetings.Add(meeting);
                }
                db.Trips.Add(trip);
            }

            foreach (var ef in bundle.Flights)
            {
                if (!peopleByName.TryGetValue(ef.TravellerName, out var traveller)) continue;
                db.Flights.Add(new Flight
                {
                    TravellerPersonId = traveller.Id, OriginLabel = ef.OriginLabel, DestinationLabel = ef.DestinationLabel,
                    FlightDateText = ef.FlightDateText, FlightNo = ef.FlightNo, DepartText = ef.DepartText,
                    ArriveText = ef.ArriveText, Aircraft = ef.Aircraft
                });
            }

            foreach (var ee in bundle.TeamPlan)
            {
                if (!peopleByName.TryGetValue(ee.PersonName, out var person)) continue;
                City? city = ee.CityLabel is not null && cityByLabel.TryGetValue(ee.CityLabel, out var c2) ? c2 : null;
                db.TeamPlanEntries.Add(new TeamPlanEntry
                {
                    PersonId = person.Id, FromDate = ee.FromDate, ToDate = ee.ToDate, CityId = city?.Id,
                    Type = ee.Type, Notes = ee.Notes, ApprovalStatus = ee.ApprovalStatus
                });
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok(new { imported = true });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
