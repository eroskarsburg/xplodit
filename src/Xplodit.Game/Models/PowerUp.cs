namespace Xplodit.Game.Models;

public sealed class PowerUp
{
    public required int X { get; init; }
    public required int Y { get; init; }
    public required PowerUpType Type { get; init; }
    /// <summary>Freshly revealed power-ups survive the blast that uncovered them.</summary>
    public float Protection { get; set; } = ExplosionCell.Duration + 0.05f;
}
