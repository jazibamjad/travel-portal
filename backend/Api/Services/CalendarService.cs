using Api.Data;
using Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class CalendarService(AppDbContext db, PlanAggregationService agg)
{
    public async Task<CalendarResponse> GetCalendarAsync(List<Guid>? personIds)
    {
        var people = await db.People
            .Where(p => personIds == null || personIds.Count == 0 || personIds.Contains(p.Id))
            .ToListAsync();

        var merged = await agg.GetMergedEntriesAsync(people.Select(p => p.Id));

        var entries = new List<CalendarEntryDto>();
        foreach (var person in people)
        {
            foreach (var e in merged.GetValueOrDefault(person.Id, []))
            {
                entries.Add(new CalendarEntryDto(
                    person.Id, person.FullName, person.Title, person.Function,
                    e.FromDate, e.ToDate, e.CityLabel, e.Type, e.ApprovalStatus, e.TripId));
            }
        }

        return new CalendarResponse(entries);
    }
}
