namespace Xplodit.Game.Maps;

public enum MapLayout : byte
{
    /// <summary>Classic grid of pillars.</summary>
    Pillars = 0,
    /// <summary>Pillars plus a few walled rooms with doorways.</summary>
    Rooms = 1,
    /// <summary>Wide open center ring, good for chasing.</summary>
    Ring = 2,
    /// <summary>Irregular hard walls scattered around.</summary>
    Scattered = 3
}

public sealed class MapDefinition
{
    public const int DefaultWidth = 25;
    public const int DefaultHeight = 19;

    public required string Id { get; init; }
    public required string ThemeId { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required string AccentColor { get; init; }
    public required string FloorColor { get; init; }
    public required string WallColor { get; init; }
    public required string SoftBlockColor { get; init; }
    public MapLayout Layout { get; init; } = MapLayout.Pillars;
    public double SoftChance { get; init; } = 0.6;
    /// <summary>Fraction of floor tiles that are slippery ice.</summary>
    public double IceChance { get; init; }
    public bool HasSprites { get; init; }

    public int Width { get; init; } = DefaultWidth;
    public int Height { get; init; } = DefaultHeight;

    public (int X, int Y)[] Spawns => [(1, 1), (Width - 2, Height - 2), (Width - 2, 1), (1, Height - 2)];

    public string FloorSprite => HasSprites ? $"assets/themes/{ThemeId}/floor.png" : string.Empty;
    public string WallSprite => HasSprites ? $"assets/themes/{ThemeId}/wall.png" : string.Empty;
    public string SoftSprite => HasSprites ? $"assets/themes/{ThemeId}/soft.png" : string.Empty;
}
