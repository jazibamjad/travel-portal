using Api.Services;
using Xunit;

namespace Api.Tests;

public class PlanAggregationServiceTests
{
    // DaysByCity is pure (no DB access), so the DbContext dependency can be left null for this test.
    private readonly PlanAggregationService _sut = new(null!);

    [Fact]
    public void DaysByCity_SumsDaysAcrossMultipleEntriesInSameCity()
    {
        var entries = new List<MergedEntry>
        {
            new(new DateOnly(2026, 6, 23), new DateOnly(2026, 6, 25), "Prague, Czechia", "Trip", "", null, null),
            new(new DateOnly(2026, 9, 1), new DateOnly(2026, 9, 1), "Prague, Czechia", "Option", "", null, null),
            new(new DateOnly(2026, 8, 2), new DateOnly(2026, 8, 28), "New York, United States", "Trip", "", null, null),
        };

        var result = _sut.DaysByCity(entries);

        Assert.Equal(4, result["Prague, Czechia"]); // 3 + 1
        Assert.Equal(27, result["New York, United States"]);
    }

    [Fact]
    public void DaysByCity_IgnoresEntriesWithoutDatesOrCity()
    {
        var entries = new List<MergedEntry>
        {
            new(null, null, null, "Option", "dates TBC", null, null),
            new(new DateOnly(2026, 6, 23), null, null, "Option", "no city yet", null, null),
        };

        var result = _sut.DaysByCity(entries);

        Assert.Empty(result);
    }
}
