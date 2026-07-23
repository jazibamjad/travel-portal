using Api.Data;
using Api.Dtos;
using Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class KpiService(AppDbContext db)
{
    public async Task<KpiResponse> GetKpisAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var trips = await db.Trips
            .Include(t => t.DestinationCity)
            .Include(t => t.Meetings)
            .ToListAsync();

        var dated = trips.Where(t => t.FromDate is not null).ToList();
        var upcoming = dated.Where(t => (t.ToDate ?? t.FromDate!.Value) >= today).ToList();
        var next = upcoming.OrderBy(t => t.FromDate).FirstOrDefault();

        var totalDays = dated.Sum(t => DateMath.DaysBetween(t.FromDate, t.ToDate));
        var meetingsCount = trips.Sum(t => t.Meetings.Count);

        return new KpiResponse(
            upcoming.Count,
            next?.DestinationCity?.CityName,
            next?.FromDate,
            totalDays,
            meetingsCount);
    }
}
