namespace Xplodit.Game.Models;

public sealed class Monster
{
    public required int Id { get; init; }
    public int X { get; set; }
    public int Y { get; set; }
    public float DisplayX { get; set; }
    public float DisplayY { get; set; }
    public int FromX { get; set; }
    public int FromY { get; set; }
    public float MoveProgress { get; set; } = 1f;
    public Direction Facing { get; set; } = Direction.Left;
    public bool IsAlive { get; set; } = true;
    public float RespawnTimer { get; set; }

    public bool IsMoving => MoveProgress < 1f;

    public void SyncDisplayToCell()
    {
        FromX = X;
        FromY = Y;
        DisplayX = X;
        DisplayY = Y;
        MoveProgress = 1f;
    }
}
