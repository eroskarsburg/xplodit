namespace Xplodit.Game.Models;

public sealed class Bomb
{
    public const float DefaultFuse = 2.4f;
    public const float SlideDuration = 0.09f;
    public const float RemoteFuse = 10f;
    public const float ThrowDuration = 0.38f;
    public const float BounceDuration = 0.14f;

    public required int Id { get; init; }
    public required int OwnerId { get; init; }
    public int X { get; set; }
    public int Y { get; set; }
    public float DisplayX { get; set; }
    public float DisplayY { get; set; }
    public required int Range { get; init; }
    public bool Pierce { get; init; }
    public bool Freeze { get; init; }
    /// <summary>Remote bombs wait for their owner to detonate them (with a long safety fuse).</summary>
    public bool Remote { get; init; }
    public float Age { get; set; }

    // Thrown with the glove: flies over anything and lands on the target cell.
    public bool IsFlying { get; set; }
    public float FlyProgress { get; set; }
    public float FlyDuration { get; set; }
    public Direction FlyDirection { get; set; } = Direction.None;
    public int FlyToX { get; set; }
    public int FlyToY { get; set; }
    /// <summary>0..1 height of the throw arc, for rendering.</summary>
    public float FlyHeight { get; set; }
    public float FuseRemaining { get; set; } = DefaultFuse;
    public bool Exploded { get; set; }
    public bool IsSliding { get; set; }
    public Direction SlideDirection { get; set; } = Direction.None;
    public float SlideProgress { get; set; }
    public float SlideFromX { get; set; }
    public float SlideFromY { get; set; }
    public float SlideToX { get; set; }
    public float SlideToY { get; set; }

    /// <summary>Actors that were standing on the bomb when it was placed may still walk off it.</summary>
    public HashSet<int> PassThrough { get; } = [];

    public void SyncDisplayToCell()
    {
        DisplayX = X;
        DisplayY = Y;
        SlideFromX = X;
        SlideFromY = Y;
        SlideToX = X;
        SlideToY = Y;
        SlideProgress = 1f;
        IsSliding = false;
        SlideDirection = Direction.None;
    }
}
