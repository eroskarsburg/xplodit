namespace Xplodit.Game.Models;

public enum Direction : byte
{
    None = 0,
    Up = 1,
    Down = 2,
    Left = 3,
    Right = 4
}

public static class DirectionExtensions
{
    public static (int Dx, int Dy) ToOffset(this Direction direction) => direction switch
    {
        Direction.Up => (0, -1),
        Direction.Down => (0, 1),
        Direction.Left => (-1, 0),
        Direction.Right => (1, 0),
        _ => (0, 0)
    };
}
