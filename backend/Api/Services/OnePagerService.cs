using Api.Data;
using Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class OnePagerService(AppDbContext db, PlanAggregationService agg)
{
    public async Task<OnePagerResponse?> GetPersonOnePagerAsync(Guid personId)
    {
        var person = await db.People.FirstOrDefaultAsync(p => p.Id == personId);
        if (person is null) return null;

        var merged = (await agg.GetMergedEntriesAsync([personId]))[personId]
            .OrderBy(e => e.FromDate ?? DateOnly.MaxValue)
            .ToList();

        var itinerary = merged
            .Where(e => e.FromDate is not null || e.CityLabel is not null || !string.IsNullOrEmpty(e.Notes))
            .Select(e => new ItineraryRow(e.FromDate, e.ToDate, DateMath.DaysBetween(e.FromDate, e.ToDate), e.CityLabel ?? "", e.Type, e.Notes))
            .ToList();

        var daysByCity = agg.DaysByCity(merged)
            .OrderByDescending(kv => kv.Value)
            .Select(kv => new DaysByCityRow(kv.Key, kv.Value))
            .ToList();
        var totalDays = daysByCity.Sum(d => d.Days);

        var trips = await db.Trips
            .Include(t => t.DestinationCity)
            .Include(t => t.Travellers)
            .Include(t => t.Meetings).ThenInclude(m => m.Contact)
            .Include(t => t.Meetings).ThenInclude(m => m.Attendees)
            .Include(t => t.Meetings).ThenInclude(m => m.Materials).ThenInclude(m => m.OwnerPerson)
            .Where(t => t.Travellers.Any(p => p.Id == personId) || t.Meetings.Any(m => m.Attendees.Any(a => a.Id == personId)))
            .ToListAsync();

        var tripSections = trips.Select(BuildTripSection).ToList();

        return new OnePagerResponse(person.Id, person.FullName, person.Title, person.Function,
            itinerary, daysByCity, totalDays, tripSections);
    }

    public async Task<OnePagerTripSection?> GetTripOnePagerAsync(Guid tripId)
    {
        var trip = await db.Trips
            .Include(t => t.DestinationCity)
            .Include(t => t.Travellers)
            .Include(t => t.Meetings).ThenInclude(m => m.Contact)
            .Include(t => t.Meetings).ThenInclude(m => m.Attendees)
            .Include(t => t.Meetings).ThenInclude(m => m.Materials).ThenInclude(m => m.OwnerPerson)
            .FirstOrDefaultAsync(t => t.Id == tripId);

        return trip is null ? null : BuildTripSection(trip);
    }

    private static OnePagerTripSection BuildTripSection(Entities.Trip trip)
    {
        var meetings = trip.Meetings.OrderBy(m => m.OrderNum).Select(m => new OnePagerMeetingRow(
            m.OrderNum, m.MeetingTime, m.Contact!.Name, m.Project, m.Entity,
            m.Status.ToString(), m.Priority.ToString(), m.Agenda,
            m.Attendees.Select(a => a.FullName).ToList())).ToList();

        var materials = trip.Meetings
            .SelectMany(m => m.Materials.Select(mat => new OnePagerMaterialRow(mat.Description, m.Contact!.Name, mat.OwnerPerson?.FullName)))
            .ToList();

        return new OnePagerTripSection(
            trip.Id, trip.DestinationCity!.Label, trip.Project, trip.Entity, trip.FromDate, trip.ToDate,
            DateMath.DaysBetween(trip.FromDate, trip.ToDate), trip.Status.ToString(), trip.Hotel, trip.Transport,
            trip.Travellers.Select(t => t.FullName).ToList(), meetings, materials);
    }
}
