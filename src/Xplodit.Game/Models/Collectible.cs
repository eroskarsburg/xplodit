namespace Xplodit.Game.Models;

public enum CollectibleKind : byte
{
    Star = 0,
    Coin = 1,
    BigCoin = 2
}

public sealed class Collectible
{
    public required int X { get; init; }
    public required int Y { get; init; }
    public required CollectibleKind Kind { get; init; }
    /// <summary>Delay before it can be picked up (used for dropped stars).</summary>
    public float PickupDelay { get; set; }
}
