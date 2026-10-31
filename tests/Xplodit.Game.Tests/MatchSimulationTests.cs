using Xplodit.Game.Maps;
using Xplodit.Game.Models;

namespace Xplodit.Game.Tests;

/// <summary>Plays whole matches headless (idle human + bots) to catch crashes, hangs and bad bot behavior.</summary>
public class MatchSimulationTests
{
    private const float Step = 1 / 60f;
    private const float MaxSeconds = 600f;

    public static TheoryData<GameMode> Modes()
    {
        var data = new TheoryData<GameMode>();
        foreach (var mode in Enum.GetValues<GameMode>())
        {
            data.Add(mode);
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(Modes))]
    public void Every_map_and_difficulty_finishes_the_match(GameMode mode)
    {
        var seed = (int)mode * 100;
        foreach (var map in MapCatalog.All)
        {
            foreach (var difficulty in Enum.GetValues<Difficulty>())
            {
                seed++;
                var settings = new MatchSettings
                {
                    Mode = mode,
                    Bots = 3,
                    Monsters = seed % 3 == 0 ? 2 : 0,
                    Rounds = 1,
                    Difficulty = difficulty
                };

                var session = Play(map, settings, seed);

                Assert.True(session.Phase == MatchPhase.MatchOver,
                    $"{mode}/{map.Id}/{difficulty} did not finish within {MaxSeconds}s of game time.");
            }
        }
    }

    [Fact]
    public void Bots_mostly_get_hit_by_rivals_not_by_their_own_bombs()
    {
        int hits = 0, selfHits = 0;
        var seed = 0;
        foreach (var map in MapCatalog.All)
        {
            foreach (var difficulty in Enum.GetValues<Difficulty>())
            {
                var settings = new MatchSettings { Mode = GameMode.Classic, Bots = 3, Rounds = 1, Difficulty = difficulty };
                var session = Play(map, settings, ++seed);
                foreach (var bot in session.Actors.Where(a => !a.IsHuman))
                {
                    hits += bot.HitsTaken;
                    selfHits += bot.SelfHits;
                }
            }
        }

        Assert.True(hits > 0, "Bots never fought each other.");
        var ratio = (double)selfHits / hits;
        Assert.True(ratio < 0.4, $"Bots caused {ratio:P0} of their own damage.");
    }

    private static GameSession Play(MapDefinition map, MatchSettings settings, int seed)
    {
        var session = new GameSession(map, settings, [], seed);
        var input = new GameInput();
        for (var t = 0f; session.Phase != MatchPhase.MatchOver && t < MaxSeconds; t += Step)
        {
            session.Update(Step, input);
            session.DrainEvents();
        }

        return session;
    }
}
