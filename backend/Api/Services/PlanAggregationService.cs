using Api.Data;
using Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public record MergedEntry(DateOnly? FromDate, DateOnly? ToDate, string? CityLabel, string Type, string Notes, string? ApprovalStatus, Guid? TripId);

/// <summary>
/// Mirrors the prototype's personEntries(name): merges a person's own team-plan rows with
/// any CEO trip where they are a traveller, de-duplicating trips already represented as a
/// team-plan row with matching dates/city.
/// </summary>
public class PlanAggregationService(AppDbContext db)
{
    public async Task<Dictionary<Guid, List<MergedEntry>>> GetMergedEntriesAsync(IEnumerable<Guid> personIds)
    {
        var ids = personIds.ToHashSet();

        var teamRows = await db.TeamPlanEntries
            .Include(t => t.City)
            .Where(t => ids.Contains(t.PersonId))
            .ToListAsync();

        var trips = await db.Trips
            .Include(t => t.DestinationCity)
            .Include(t => t.Travellers)
            .Where(t => t.Travellers.Any(p => ids.Contains(p.Id)))
            .ToListAsync();

        var result = ids.ToDictionary(id => id, _ => new List<MergedEntry>());

        foreach (var row in teamRows)
        {
            result[row.PersonId].Add(new MergedEntry(
                row.FromDate, row.ToDate, row.City?.Label, row.Type.ToString(), row.Notes,
                row.ApprovalStatus?.ToString(), null));
        }

        foreach (var trip in trips)
        {
            var type = trip.Status == TripStatus.Confirmed ? "Trip" : "Option";
            foreach (var person in trip.Travellers.Where(p => ids.Contains(p.Id)))
            {
                var dup = result[person.Id].Any(e =>
                    e.FromDate == trip.FromDate && e.ToDate == trip.ToDate && e.CityLabel == trip.DestinationCity!.Label);
                if (dup) continue;
                result[person.Id].Add(new MergedEntry(
                    trip.FromDate, trip.ToDate, trip.DestinationCity!.Label, type,
                    trip.Project, null, trip.Id));
            }
        }

        return result;
    }

    public Dictionary<string, int> DaysByCity(List<MergedEntry> entries)
    {
        var map = new Dictionary<string, int>();
        foreach (var e in entries.Where(e => e.FromDate is not null && e.CityLabel is not null))
        {
            var days = DateMath.DaysBetween(e.FromDate, e.ToDate);
            map[e.CityLabel!] = map.GetValueOrDefault(e.CityLabel!) + days;
        }
        return map;
    }
}
