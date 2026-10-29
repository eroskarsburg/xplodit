namespace Xplodit.Game.Models;

public sealed class ExplosionCell
{
    public const float Duration = 0.5f;

    public required int X { get; init; }
    public required int Y { get; init; }
    public int OwnerId { get; init; } = -1;
    public bool Freeze { get; init; }
    /// <summary>0 = center, 1 = horizontal arm, 2 = vertical arm.</summary>
    public byte Shape { get; init; }
    public float TimeRemaining { get; set; } = Duration;
}
