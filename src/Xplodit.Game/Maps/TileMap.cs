using Xplodit.Game.Models;

namespace Xplodit.Game.Maps;

public sealed class TileMap
{
    private readonly TileType[,] _tiles;
    private readonly bool[,] _ice;
    private readonly int[,] _paint;

    public int Width { get; }
    public int Height { get; }
    public string FloorColor { get; }
    public string WallColor { get; }
    public string SoftBlockColor { get; }
    public string ThemeId { get; }

    public TileMap(MapDefinition definition, string[] rows, bool[,] ice)
    {
        Width = definition.Width;
        Height = definition.Height;
        FloorColor = definition.FloorColor;
        WallColor = definition.WallColor;
        SoftBlockColor = definition.SoftBlockColor;
        ThemeId = definition.ThemeId;
        _tiles = new TileType[Width, Height];
        _ice = ice;
        _paint = new int[Width, Height];

        for (var y = 0; y < Height; y++)
        {
            var row = rows[y];
            for (var x = 0; x < Width; x++)
            {
                _tiles[x, y] = row[x] switch
                {
                    '#' => TileType.Wall,
                    'B' => TileType.SoftBlock,
                    _ => TileType.Empty
                };
                _paint[x, y] = -1;
            }
        }
    }

    public TileType Get(int x, int y) => _tiles[x, y];

    public void Set(int x, int y, TileType type) => _tiles[x, y] = type;

    public bool InBounds(int x, int y) => x >= 0 && y >= 0 && x < Width && y < Height;

    public bool IsWalkable(int x, int y) => InBounds(x, y) && _tiles[x, y] == TileType.Empty;

    public bool IsIce(int x, int y) => InBounds(x, y) && _ice[x, y];

    public int GetPaint(int x, int y) => _paint[x, y];

    public void SetPaint(int x, int y, int ownerId) => _paint[x, y] = ownerId;

    public IEnumerable<(int X, int Y)> Cells()
    {
        for (var y = 0; y < Height; y++)
        {
            for (var x = 0; x < Width; x++)
            {
                yield return (x, y);
            }
        }
    }
}
