using Api.Data;
using Api.Dtos;
using Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/flights")]
[Authorize]
public class FlightsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<FlightDto>>> GetAll()
    {
        var flights = await db.Flights.Include(f => f.TravellerPerson).OrderBy(f => f.FlightDateText).ToListAsync();
        return Ok(flights.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<FlightDto>> Create(UpsertFlightRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.OriginLabel) && string.IsNullOrWhiteSpace(req.DestinationLabel) && string.IsNullOrWhiteSpace(req.FlightNo))
            return BadRequest(new { error = "Choose From / To or enter a flight number" });

        var flight = new Flight
        {
            TravellerPersonId = req.TravellerPersonId,
            OriginLabel = req.OriginLabel ?? "",
            DestinationLabel = req.DestinationLabel ?? "",
            FlightDateText = req.FlightDateText ?? "",
            FlightNo = req.FlightNo ?? "",
            DepartText = req.DepartText ?? "",
            ArriveText = req.ArriveText ?? "",
            Aircraft = req.Aircraft ?? "",
            TripId = req.TripId
        };
        db.Flights.Add(flight);
        await db.SaveChangesAsync();

        var loaded = await db.Flights.Include(f => f.TravellerPerson).FirstAsync(f => f.Id == flight.Id);
        return Ok(ToDto(loaded));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<FlightDto>> Update(Guid id, UpsertFlightRequest req)
    {
        var flight = await db.Flights.Include(f => f.TravellerPerson).FirstOrDefaultAsync(f => f.Id == id);
        if (flight is null) return NotFound();

        flight.TravellerPersonId = req.TravellerPersonId;
        flight.OriginLabel = req.OriginLabel ?? flight.OriginLabel;
        flight.DestinationLabel = req.DestinationLabel ?? flight.DestinationLabel;
        flight.FlightDateText = req.FlightDateText ?? flight.FlightDateText;
        flight.FlightNo = req.FlightNo ?? flight.FlightNo;
        flight.DepartText = req.DepartText ?? flight.DepartText;
        flight.ArriveText = req.ArriveText ?? flight.ArriveText;
        flight.Aircraft = req.Aircraft ?? flight.Aircraft;
        if (req.TripId is not null) flight.TripId = req.TripId;

        await db.SaveChangesAsync();
        return Ok(ToDto(flight));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var flight = await db.Flights.FindAsync(id);
        if (flight is null) return NotFound();
        db.Flights.Remove(flight);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/attach/{tripId:guid}")]
    public async Task<ActionResult<FlightDto>> Attach(Guid id, Guid tripId)
    {
        var flight = await db.Flights.Include(f => f.TravellerPerson).FirstOrDefaultAsync(f => f.Id == id);
        if (flight is null) return NotFound();
        var tripExists = await db.Trips.AnyAsync(t => t.Id == tripId);
        if (!tripExists) return BadRequest(new { error = "Unknown trip" });

        flight.TripId = tripId;
        await db.SaveChangesAsync();
        return Ok(ToDto(flight));
    }

    private static FlightDto ToDto(Flight f) => new(
        f.Id, f.TravellerPersonId, f.TravellerPerson?.FullName ?? "", f.TripId,
        f.OriginLabel, f.DestinationLabel, f.FlightDateText, f.FlightNo, f.DepartText, f.ArriveText, f.Aircraft);
}
