using Api.Data;
using Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

/// <summary>
/// Finds a City by its "City, Country" label, creating it if it doesn't exist yet
/// (mirrors the prototype's free-text destination field, which silently accepts new cities).
/// Registered Scoped (see Program.cs) — it wraps AppDbContext, which is itself Scoped, so this
/// can never be a Singleton without capturing a disposed/stale DbContext across requests.
/// </summary>
public class CityResolver(AppDbContext db)
{
    public async Task<City> GetOrCreateAsync(string label)
    {
        var trimmed = label.Trim();
        var existing = await db.Cities.FirstOrDefaultAsync(c => c.Label == trimmed);
        if (existing is not null) return existing;

        var parts = trimmed.Split(',', 2);
        var city = new City { CityName = parts[0].Trim(), Country = parts.Length > 1 ? parts[1].Trim() : "", Label = trimmed };
        db.Cities.Add(city);
        await db.SaveChangesAsync();
        return city;
    }
}
