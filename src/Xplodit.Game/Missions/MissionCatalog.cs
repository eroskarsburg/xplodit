using Xplodit.Game.Models;

namespace Xplodit.Game.Missions;

public sealed record Mission(string Id, string Description, int Reward, Func<GameSession, Actor, bool> Check);

public sealed record MissionResult(Mission Mission, bool Completed);

/// <summary>Three missions are drawn per match; each completed one grants a star and points for the shop.</summary>
public static class MissionCatalog
{
    private static readonly Mission[] Common =
    [
        new("blocks25", "Destrua 25 blocos", 80, (_, a) => a.BlocksDestroyed >= 25),
        new("blocks50", "Destrua 50 blocos", 150, (_, a) => a.BlocksDestroyed >= 50),
        new("powers6", "Pegue 6 power-ups", 80, (_, a) => a.PowerUpsCollected >= 6),
        new("powers12", "Pegue 12 power-ups", 150, (_, a) => a.PowerUpsCollected >= 12),
        new("paint40", "Pinte 40 casas com suas explosões numa rodada", 120, (_, a) => a.MaxPainted >= 40),
        new("score1500", "Faça 1500 pontos na partida", 120, (_, a) => a.MatchScore >= 1500),
        new("winmatch", "Vença a partida", 200, (s, a) => s.Standings[0].Id == a.Id)
    ];

    private static readonly Mission[] Combat =
    [
        new("kills2", "Acerte rivais 2 vezes", 100, (_, a) => a.Kills >= 2),
        new("kills5", "Acerte rivais 5 vezes", 180, (_, a) => a.Kills >= 5),
        new("nohit", "Vença uma rodada sem levar dano", 220, (s, a) => a.RoundWins > 0 && a.HitsTaken == 0),
        new("rounds2", "Vença 2 rodadas", 160, (_, a) => a.RoundWins >= 2)
    ];

    private static readonly Dictionary<GameMode, Mission[]> ByMode = new()
    {
        [GameMode.StarCollector] =
        [
            new("stars15", "Junte 15 estrelas na partida", 150, (_, a) => a.TotalStars >= 15),
            new("stars25", "Junte 25 estrelas na partida", 220, (_, a) => a.TotalStars >= 25)
        ],
        [GameMode.CoinRush] =
        [
            new("coins60", "Coma 60 moedas", 120, (_, a) => a.TotalCoins >= 60),
            new("coins150", "Coma 150 moedas", 220, (_, a) => a.TotalCoins >= 150),
            new("monsters3", "Derrote 3 monstros", 160, (_, a) => a.MonstersDefeated >= 3)
        ],
        [GameMode.IceAge] =
        [
            new("ice3", "Quebre rivais congelados 3 vezes", 180, (_, a) => a.Kills >= 3)
        ],
        [GameMode.BattleRoyale] =
        [
            new("survive", "Vença uma rodada de Battle Royale", 200, (_, a) => a.RoundWins >= 1)
        ]
    };

    public static IReadOnlyList<Mission> Draw(GameMode mode, int monsters, Random random)
    {
        var pool = new List<Mission>(Common);
        if (mode != GameMode.CoinRush && mode != GameMode.StarCollector)
        {
            pool.AddRange(Combat);
        }

        if (monsters > 0 && mode != GameMode.CoinRush)
        {
            pool.Add(new Mission("monsters2", "Derrote 2 monstros", 120, (_, a) => a.MonstersDefeated >= 2));
        }

        var picks = new List<Mission>();
        if (ByMode.TryGetValue(mode, out var specific))
        {
            picks.Add(specific[random.Next(specific.Length)]);
        }

        foreach (var m in pool.OrderBy(_ => random.Next()))
        {
            if (picks.Count >= 3)
            {
                break;
            }

            if (picks.All(p => p.Id != m.Id))
            {
                picks.Add(m);
            }
        }

        return picks;
    }

    /// <summary>Missions are checked against the best-performing local player.</summary>
    public static IReadOnlyList<MissionResult> Evaluate(IReadOnlyList<Mission> missions, GameSession session) =>
        missions.Select(m => new MissionResult(m, session.Humans.Any(h => m.Check(session, h)))).ToList();
}
