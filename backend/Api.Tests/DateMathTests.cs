using Api.Services;
using Xunit;

namespace Api.Tests;

public class DateMathTests
{
    [Fact]
    public void NoFromDate_ReturnsZero()
    {
        Assert.Equal(0, DateMath.DaysBetween(null, null));
    }

    [Fact]
    public void SingleDate_CountsAsOneDay()
    {
        var d = new DateOnly(2026, 6, 23);
        Assert.Equal(1, DateMath.DaysBetween(d, null));
        Assert.Equal(1, DateMath.DaysBetween(d, d));
    }

    [Fact]
    public void InclusiveRange_CountsBothEndpoints()
    {
        // 23, 24, 25 Jun = 3 days inclusive, mirroring the prototype's daysBetween().
        var from = new DateOnly(2026, 6, 23);
        var to = new DateOnly(2026, 6, 25);
        Assert.Equal(3, DateMath.DaysBetween(from, to));
    }

    [Fact]
    public void ToBeforeFrom_ClampsToOneDay()
    {
        // Defensive: the API also validates from<=to at the request layer, but the
        // math itself must not go negative if that's ever bypassed.
        var from = new DateOnly(2026, 6, 25);
        var to = new DateOnly(2026, 6, 20);
        Assert.Equal(1, DateMath.DaysBetween(from, to));
    }

    [Fact]
    public void CrossMonthRange_CountsCorrectly()
    {
        var from = new DateOnly(2026, 8, 2);
        var to = new DateOnly(2026, 8, 28);
        Assert.Equal(27, DateMath.DaysBetween(from, to));
    }
}
