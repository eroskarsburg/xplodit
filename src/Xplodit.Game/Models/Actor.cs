namespace Xplodit.Game.Models;

public sealed class Actor
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public bool IsHuman { get; init; }
    /// <summary>0 or 1 for local humans, -1 for bots.</summary>
    public int PlayerIndex { get; init; } = -1;
    public required string Color { get; init; }
    public required CharacterLoadout Loadout { get; set; }

    public bool IsAlive { get; set; } = true;
    public int X { get; set; }
    public int Y { get; set; }
    public int SpawnX { get; set; }
    public int SpawnY { get; set; }
    public float DisplayX { get; set; }
    public float DisplayY { get; set; }
    public Direction Facing { get; set; } = Direction.Down;
    public bool IsMoving { get; set; }
    public float MoveProgress { get; set; }
    public float MoveFromX { get; set; }
    public float MoveFromY { get; set; }
    public float MoveToX { get; set; }
    public float MoveToY { get; set; }

    // Power-up state (reset every round)
    public int MaxBombs { get; set; } = 1;
    public int BlastRange { get; set; } = 2;
    public int SpeedLevel { get; set; }
    public bool CanKick { get; set; }
    public bool HasShield { get; set; }
    public bool HasPierce { get; set; }
    public bool HasGlove { get; set; }
    public bool HasRemote { get; set; }
    public float GhostTime { get; set; }
    public CurseType Curse { get; set; }
    public float CurseTime { get; set; }
    public int ActiveBombs { get; set; }

    // Health
    public int Lives { get; set; } = 3;
    public float InvulnerableTime { get; set; }
    public float FrozenTime { get; set; }
    public float RespawnTimer { get; set; }

    // Round score
    public int Stars { get; set; }
    public int Coins { get; set; }
    public int Score { get; set; }
    public int PaintedTiles { get; set; }

    // Match totals
    public int RoundWins { get; set; }
    public int MatchScore { get; set; }
    public int Kills { get; set; }
    public int BlocksDestroyed { get; set; }
    public int PowerUpsCollected { get; set; }
    public int HitsTaken { get; set; }
    public int TotalStars { get; set; }
    public int TotalCoins { get; set; }
    public int MonstersDefeated { get; set; }
    public int MaxPainted { get; set; }
    public int SelfHits { get; set; }

    public float MoveInterval
    {
        get
        {
            var interval = 0.24f - SpeedLevel * 0.025f;
            if (Curse == CurseType.Slow)
            {
                interval *= 1.8f;
            }

            return Math.Max(0.12f, interval);
        }
    }

    public bool IsFrozen => FrozenTime > 0f;
    public bool IsGhost => GhostTime > 0f;
    public bool IsInvulnerable => InvulnerableTime > 0f;
    public bool IsRespawning => !IsAlive && RespawnTimer > 0f;

    public bool CanPlaceBomb => IsAlive && !IsFrozen && ActiveBombs < MaxBombs;

    public void ResetPowerUps()
    {
        MaxBombs = 1;
        BlastRange = 2;
        SpeedLevel = 0;
        CanKick = false;
        HasShield = false;
        HasPierce = false;
        HasGlove = false;
        HasRemote = false;
        GhostTime = 0f;
        Curse = CurseType.None;
        CurseTime = 0f;
    }

    public void ResetForRound(int spawnX, int spawnY, int lives)
    {
        ResetPowerUps();
        IsAlive = true;
        SpawnX = spawnX;
        SpawnY = spawnY;
        X = spawnX;
        Y = spawnY;
        Facing = Direction.Down;
        ActiveBombs = 0;
        Lives = lives;
        InvulnerableTime = 0f;
        FrozenTime = 0f;
        RespawnTimer = 0f;
        Stars = 0;
        Coins = 0;
        Score = 0;
        PaintedTiles = 0;
        SyncDisplayToCell();
    }

    public void SyncDisplayToCell()
    {
        DisplayX = X;
        DisplayY = Y;
        MoveFromX = X;
        MoveFromY = Y;
        MoveToX = X;
        MoveToY = Y;
        MoveProgress = 1f;
        IsMoving = false;
    }
}
