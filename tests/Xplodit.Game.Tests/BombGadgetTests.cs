using Xplodit.Game.Maps;
using Xplodit.Game.Models;

namespace Xplodit.Game.Tests;

public class BombGadgetTests
{
    private const float Step = 1 / 60f;

    /// <summary>A fresh classic round, past the countdown, with the bots unable to interfere for a few frames.</summary>
    private static (GameSession Session, Actor Human, GameInput Input) StartPlaying(int seed = 42)
    {
        var session = new GameSession(MapCatalog.All[0], new MatchSettings { Mode = GameMode.Classic, Bots = 1, Rounds = 1 }, [], seed);
        var input = new GameInput();
        while (session.Phase == MatchPhase.Countdown)
        {
            session.Update(Step, input);
        }

        return (session, session.Actors.First(a => a.IsHuman), input);
    }

    [Fact]
    public void Glove_throws_a_bomb_exactly_three_cells_ahead_on_a_clear_path()
    {
        var (session, human, input) = StartPlaying();
        human.HasGlove = true;
        human.Facing = Direction.Down;
        var (x, y) = (human.X, human.Y);
        for (var k = 1; k <= 4; k++)
        {
            session.Map.Set(x, y + k, TileType.Empty);
        }

        Assert.True(session.TryPlaceBomb(human));
        Assert.True(session.TryThrowBomb(human));
        var bomb = session.Bombs.Single(b => b.OwnerId == human.Id);
        Assert.True(bomb.IsFlying);

        Fly(session, input, bomb);

        Assert.Equal((x, y + 3), (bomb.X, bomb.Y));
    }

    [Fact]
    public void Thrown_bomb_bounces_over_blocks_until_it_finds_a_free_cell()
    {
        var (session, human, input) = StartPlaying();
        human.HasGlove = true;
        human.Facing = Direction.Down;
        var (x, y) = (human.X, human.Y);
        session.Map.Set(x, y + 3, TileType.SoftBlock);
        session.Map.Set(x, y + 4, TileType.SoftBlock);
        session.Map.Set(x, y + 5, TileType.Empty);

        Assert.True(session.TryPlaceBomb(human));
        Assert.True(session.TryThrowBomb(human));
        var bomb = session.Bombs.Single(b => b.OwnerId == human.Id);

        Fly(session, input, bomb);

        Assert.Equal((x, y + 5), (bomb.X, bomb.Y));
    }

    private static void Fly(GameSession session, GameInput input, Bomb bomb)
    {
        for (var i = 0; i < 600 && bomb.IsFlying; i++)
        {
            session.Update(Step, input);
        }

        Assert.False(bomb.IsFlying);
        Assert.True(session.Map.IsWalkable(bomb.X, bomb.Y));
    }

    [Fact]
    public void Throwing_without_a_glove_does_nothing()
    {
        var (session, human, _) = StartPlaying();
        Assert.True(session.TryPlaceBomb(human));
        Assert.False(session.TryThrowBomb(human));
    }

    [Fact]
    public void Remote_bombs_wait_and_explode_on_command()
    {
        var (session, human, _) = StartPlaying();
        human.HasRemote = true;

        Assert.True(session.TryPlaceBomb(human));
        var bomb = session.Bombs.Single(b => b.OwnerId == human.Id);
        Assert.True(bomb.Remote);
        Assert.True(bomb.FuseRemaining > Bomb.DefaultFuse);

        Assert.True(session.Detonate(human));
        Assert.True(bomb.Exploded);
        Assert.DoesNotContain(bomb, session.Bombs);
        Assert.Contains(session.Explosions, e => e.X == bomb.X && e.Y == bomb.Y);
    }

    [Fact]
    public void Detonate_ignores_normal_bombs()
    {
        var (session, human, _) = StartPlaying();
        Assert.True(session.TryPlaceBomb(human));
        Assert.False(session.Detonate(human));
        Assert.Single(session.Bombs);
    }
}
