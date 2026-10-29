using Xplodit.Game.Models;

namespace Xplodit.Game;

public sealed class PlayerInput
{
    public Direction MoveDirection { get; set; } = Direction.None;
    public bool PlaceBomb { get; set; }
    /// <summary>Detonates remote bombs.</summary>
    public bool Detonate { get; set; }
}

public sealed class GameInput
{
    public PlayerInput[] Players { get; } = [new(), new()];
    public bool TogglePause { get; set; }
    /// <summary>Space/Enter pressed: advances round-over screens.</summary>
    public bool Confirm { get; set; }
}
