namespace Xplodit.Game.Models;

public sealed class MatchSettings
{
    public const int MaxActors = 4;
    public const int StarGoal = 10;

    public GameMode Mode { get; set; } = GameMode.Classic;
    public int HumanPlayers { get; set; } = 1;
    public int Bots { get; set; } = 3;
    public int Monsters { get; set; }
    public int Rounds { get; set; } = 3;
    public Difficulty Difficulty { get; set; } = Difficulty.Normal;

    public int TotalActors => HumanPlayers + Bots;

    public void Normalize()
    {
        HumanPlayers = Math.Clamp(HumanPlayers, 1, 2);
        Bots = Math.Clamp(Bots, 0, MaxActors - HumanPlayers);
        if (TotalActors < 2)
        {
            Bots = 2 - HumanPlayers;
        }

        Monsters = Math.Clamp(Monsters, 0, 6);
        Rounds = Rounds is 1 or 3 or 5 ? Rounds : 3;
    }

    /// <summary>Lives per round; 0 means infinite (players respawn).</summary>
    public int StartingLives => Mode switch
    {
        GameMode.BattleRoyale => 1,
        GameMode.StarCollector => 0,
        _ => 3
    };

    public float RoundDuration => Mode switch
    {
        GameMode.CoinRush => 180f,
        GameMode.BattleRoyale => 180f,
        _ => 150f
    };

    public bool RespawnsOnDeath => StartingLives == 0;

    /// <summary>Elimination modes end when one player is left; timed modes end when the clock runs out.</summary>
    public bool IsElimination => Mode is GameMode.Classic or GameMode.BattleRoyale or GameMode.IceAge;

    public MatchSettings Clone() => (MatchSettings)MemberwiseClone();
}
