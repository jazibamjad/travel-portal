using Api.Data;
using Api.Dtos;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class PeopleController(AppDbContext db, OnePagerService onePagerService) : ControllerBase
{
    [HttpGet("people")]
    public async Task<ActionResult<List<PersonDto>>> GetAll()
    {
        var people = await db.People.OrderBy(p => p.IsCeo ? 0 : 1).ThenBy(p => p.FullName).ToListAsync();
        return Ok(people.Select(p => new PersonDto(p.Id, p.FullName, p.Title, p.Function, p.IsCeo)));
    }

    [HttpPatch("people/{id:guid}")]
    public async Task<ActionResult<PersonDto>> Update(Guid id, UpdatePersonRequest req)
    {
        var person = await db.People.FindAsync(id);
        if (person is null) return NotFound();
        if (req.Title is not null) person.Title = req.Title;
        if (req.Function is not null) person.Function = req.Function;
        await db.SaveChangesAsync();
        return Ok(new PersonDto(person.Id, person.FullName, person.Title, person.Function, person.IsCeo));
    }

    [HttpGet("people/{id:guid}/one-pager")]
    public async Task<ActionResult<OnePagerResponse>> OnePager(Guid id)
    {
        var result = await onePagerService.GetPersonOnePagerAsync(id);
        return result is null ? NotFound() : Ok(result);
    }
}
