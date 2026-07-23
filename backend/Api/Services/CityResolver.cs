using Api.Data;
using Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public static class CityResolver
{
    /// <summary>Finds a City by its "City, Country" label, creating it if it doesn't exist yet
    /// (mirrors the prototype's free-text destination field, which silently accepts new cities).</summary>
    public static async Task<City> GetOrCreateAsync(AppDbContext db, string label)
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
