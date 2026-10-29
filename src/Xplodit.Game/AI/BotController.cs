using Xplodit.Game.Maps;
using Xplodit.Game.Models;

namespace Xplodit.Game.AI;

/// <summary>
/// Grid AI for CPU rivals. Each think tick it builds a timed danger map, runs one BFS over safe cells
/// and picks the best goal for the current mode: flee, grab loot, attack a rival or dig for power-ups.
/// </summary>
public sealed class BotController
{
    private static readonly Direction[] Cardinals = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

    private readonly Random _random;
    private readonly Difficulty _difficulty;
    private readonly Dictionary<int, Brain> _brains = new();

    private sealed class Brain
    {
        public float Think;
        public Direction Move;
        public bool Bomb;
    }

    public BotController(Difficulty difficulty, int? seed = null)
    {
        _difficulty = difficulty;
        _random = seed.HasValue ? new Random(seed.Value + 7) : new Random();
    }

    public void Reset() => _brains.Clear();


    private (float Min, float Max) ThinkRange => _difficulty switch
    {
        Difficulty.Easy => (0.3f, 0.5f),
        Difficulty.Hard => (0.04f, 0.1f),
        _ => (0.1f, 0.22f)
    };

    /// <summary>Rival bombs with more fuse left than this are ignored (easy bots are careless).</summary>
    private float FuseAwareness => _difficulty == Difficulty.Easy ? 1.3f : 99f;

    private double Aggression => _difficulty switch
    {
        Difficulty.Easy => 0.35,
        Difficulty.Hard => 0.95,
        _ => 0.7
    };

    public void Update(float dt, GameSession session)
    {
        foreach (var bot in session.Actors.Where(a => !a.IsHuman && a.IsAlive))
        {
            if (!_brains.TryGetValue(bot.Id, out var brain))
            {
                brain = new Brain();
                _brains[bot.Id] = brain;
            }

            brain.Think -= dt;
            if (bot.IsFrozen)
            {
                continue;
            }

            if (bot.HasRemote)
            {
                MaybeDetonate(bot, session);
            }

            if (bot.IsMoving)
            {
                continue;
            }

            if (brain.Think <= 0f)
            {
                Decide(bot, brain, session);
                var (min, max) = ThinkRange;
                brain.Think = min + (float)_random.NextDouble() * (max - min);
            }

            if (brain.Bomb)
            {
                brain.Bomb = false;
                if (session.TryPlaceBomb(bot))
                {
                    // Re-plan right away so the escape route accounts for the new bomb.
                    Decide(bot, brain, session);
                }
            }

            if (brain.Move == Direction.None)
            {
                continue;
            }

            var danger = DangerMap.Build(session, bot, FuseAwareness, _difficulty != Difficulty.Easy);
            var path = Slide(session, bot, (bot.X, bot.Y), brain.Move);
            var stepTime = StepTime(bot);
            var unsafeStep = danger.IsDanger((bot.X, bot.Y))
                ? path.Where((c, i) => danger.Overlaps(c, i * stepTime, (i + 1) * stepTime)).Any()
                : path.Any(danger.IsDanger);
            if (unsafeStep)
            {
                brain.Move = Direction.None;
                brain.Think = 0f;
                continue;
            }

            if (!session.TryMove(bot, brain.Move))
            {
                brain.Think = 0f;
            }
        }
    }

    /// <summary>
    /// Remote bombs go off once the bot is clear of all of them and a rival is caught in a blast,
    /// or after a while so the bot gets its bombs back.
    /// </summary>
    private void MaybeDetonate(Actor bot, GameSession session)
    {
        var mine = session.Bombs.Where(b => !b.Exploded && !b.IsFlying && b.Remote && b.OwnerId == bot.Id).ToList();
        if (mine.Count == 0)
        {
            return;
        }

        var blast = mine.SelectMany(b => session.ComputeBlastCells(b.X, b.Y, b.Range, b.Pierce)).Select(c => (c.X, c.Y)).ToHashSet();
        if (blast.Contains((bot.X, bot.Y)) || (bot.IsMoving && blast.Contains(((int)bot.MoveFromX, (int)bot.MoveFromY))))
        {
            return;
        }

        var catches = session.Actors.Any(a => a.IsAlive && a.Id != bot.Id && !a.IsInvulnerable && blast.Contains((a.X, a.Y)));
        var patience = _difficulty == Difficulty.Easy ? 3.5f : 2.2f;
        if (catches || mine.Max(b => b.Age) > patience)
        {
            session.Detonate(bot);
        }
    }

    /// <summary>Pessimistic time per step, including the pause between decisions.</summary>
    private float StepTime(Actor bot) => bot.MoveInterval * 1.1f + ThinkRange.Max * 0.5f;

    private void Decide(Actor bot, Brain brain, GameSession session)
    {
        brain.Bomb = false;
        var danger = DangerMap.Build(session, bot, FuseAwareness, _difficulty != Difficulty.Easy);

        if (danger.IsDanger((bot.X, bot.Y)))
        {
            brain.Move = FindSafeDirection(bot, session, danger, StepTime(bot), maxSteps: 30);
            return;
        }

        var bfs = Explore(bot, session, danger);
        var mode = session.Settings.Mode;

        // 1. Mode objectives.
        if (mode is GameMode.StarCollector or GameMode.CoinRush)
        {
            var loot = session.Collectibles
                .Where(c => c.PickupDelay <= 0.3f && bfs.Dist.ContainsKey((c.X, c.Y)))
                .OrderBy(c => bfs.Dist[(c.X, c.Y)] - (c.Kind == CollectibleKind.BigCoin ? 4 : 0))
                .FirstOrDefault();
            if (loot is not null && (mode == GameMode.CoinRush || bfs.Dist[(loot.X, loot.Y)] <= 12))
            {
                if (TryAttack(bot, brain, session, danger, onlyIfClose: true))
                {
                    return;
                }

                brain.Move = bfs.FirstStep[(loot.X, loot.Y)];
                return;
            }
        }

        // 2. Nearby power-ups (bots avoid skulls).
        var power = session.PowerUps
            .Where(p => p.Type != PowerUpType.Curse && bfs.Dist.ContainsKey((p.X, p.Y)) && bfs.Dist[(p.X, p.Y)] <= 7)
            .OrderBy(p => bfs.Dist[(p.X, p.Y)])
            .FirstOrDefault();
        if (power is not null)
        {
            brain.Move = bfs.FirstStep[(power.X, power.Y)];
            return;
        }

        // 3. Attack a rival in reach.
        if (TryAttack(bot, brain, session, danger, onlyIfClose: false))
        {
            return;
        }

        // 4. Ice Age: walk into a frozen rival to shatter it.
        var frozen = session.Actors
            .Where(a => a.IsAlive && a.Id != bot.Id && a.IsFrozen && bfs.Dist.ContainsKey((a.X, a.Y)))
            .OrderBy(a => bfs.Dist[(a.X, a.Y)])
            .FirstOrDefault();
        if (frozen is not null && bfs.Dist[(frozen.X, frozen.Y)] <= 6)
        {
            brain.Move = bfs.FirstStep[(frozen.X, frozen.Y)];
            return;
        }

        // 5. Chase the closest reachable rival, or dig toward power-ups.
        var rival = session.Actors
            .Where(a => a.IsAlive && a.Id != bot.Id && bfs.Dist.ContainsKey((a.X, a.Y)))
            .OrderBy(a => bfs.Dist[(a.X, a.Y)])
            .FirstOrDefault();
        var preferDigging = rival is null || bfs.Dist[(rival.X, rival.Y)] > 7 || _random.NextDouble() < 0.35;

        if (preferDigging && TryDig(bot, brain, session, danger, bfs))
        {
            return;
        }

        if (rival is not null && bfs.FirstStep[(rival.X, rival.Y)] != Direction.None)
        {
            brain.Move = bfs.FirstStep[(rival.X, rival.Y)];
            return;
        }

        if (TryDig(bot, brain, session, danger, bfs))
        {
            return;
        }

        brain.Move = RandomSafeStep(bot, session, danger);
    }

    private bool TryAttack(Actor bot, Brain brain, GameSession session, DangerMap danger, bool onlyIfClose)
    {
        if (!bot.CanPlaceBomb || _random.NextDouble() > Aggression)
        {
            return false;
        }

        var reach = onlyIfClose ? Math.Min(2, bot.BlastRange) : bot.BlastRange;
        var target = session.Actors.FirstOrDefault(a =>
            a.IsAlive && a.Id != bot.Id && !a.IsInvulnerable && InBlastLine(session.Map, bot.X, bot.Y, a.X, a.Y, reach, bot.HasPierce));
        if (target is null || !CanEscapeAfterBomb(bot, session, danger))
        {
            return false;
        }

        brain.Bomb = true;
        brain.Move = Direction.None;
        return true;
    }

    private bool TryDig(Actor bot, Brain brain, GameSession session, DangerMap danger, BfsResult bfs)
    {
        if (TouchesSoftBlock(session.Map, bot.X, bot.Y))
        {
            if (bot.CanPlaceBomb && CanEscapeAfterBomb(bot, session, danger))
            {
                brain.Bomb = true;
                brain.Move = Direction.None;
                return true;
            }

            return false;
        }

        var spot = bfs.Dist.Keys
            .Where(c => bfs.Dist[c] > 0 && TouchesSoftBlock(session.Map, c.X, c.Y))
            .OrderBy(c => bfs.Dist[c] + _random.Next(3))
            .Cast<(int X, int Y)?>()
            .FirstOrDefault();
        if (spot is null)
        {
            return false;
        }

        brain.Move = bfs.FirstStep[spot.Value];
        return brain.Move != Direction.None;
    }

    private static bool TouchesSoftBlock(TileMap map, int x, int y) =>
        Cardinals.Any(d =>
        {
            var (dx, dy) = d.ToOffset();
            return map.InBounds(x + dx, y + dy) && map.Get(x + dx, y + dy) == TileType.SoftBlock;
        });

    private static bool InBlastLine(TileMap map, int bx, int by, int tx, int ty, int range, bool pierce)
    {
        if (bx != tx && by != ty)
        {
            return false;
        }

        var dist = Math.Abs(bx - tx) + Math.Abs(by - ty);
        if (dist > range)
        {
            return false;
        }

        var sx = Math.Sign(tx - bx);
        var sy = Math.Sign(ty - by);
        for (var i = 1; i < dist; i++)
        {
            var tile = map.Get(bx + sx * i, by + sy * i);
            if (tile == TileType.Wall || (tile == TileType.SoftBlock && !pierce))
            {
                return false;
            }
        }

        return true;
    }

    private Direction RandomSafeStep(Actor bot, GameSession session, DangerMap danger)
    {
        var options = Cardinals
            .Where(d =>
            {
                var path = Slide(session, bot, (bot.X, bot.Y), d);
                return path.Count > 0 && !path.Any(danger.IsDanger);
            })
            .ToList();
        return options.Count == 0 ? Direction.None : options[_random.Next(options.Count)];
    }

    private sealed record BfsResult(Dictionary<(int X, int Y), int> Dist, Dictionary<(int X, int Y), Direction> FirstStep);

    /// <summary>Distances to every cell reachable without touching any danger.</summary>
    private static BfsResult Explore(Actor bot, GameSession session, DangerMap danger)
    {
        var dist = new Dictionary<(int X, int Y), int> { [(bot.X, bot.Y)] = 0 };
        var first = new Dictionary<(int X, int Y), Direction> { [(bot.X, bot.Y)] = Direction.None };
        var queue = new Queue<(int X, int Y)>();
        queue.Enqueue((bot.X, bot.Y));

        while (queue.Count > 0)
        {
            var cell = queue.Dequeue();
            foreach (var dir in Cardinals)
            {
                var path = Slide(session, bot, cell, dir);
                if (path.Count == 0 || path.Any(danger.IsDanger))
                {
                    continue;
                }

                var next = path[^1];
                if (dist.ContainsKey(next))
                {
                    continue;
                }

                dist[next] = dist[cell] + path.Count;
                first[next] = first[cell] == Direction.None ? dir : first[cell];
                queue.Enqueue(next);
            }
        }

        return new BfsResult(dist, first);
    }

    /// <summary>
    /// Time-aware BFS toward the nearest cell with no danger at all. A cell on the way is only
    /// usable if the bot passes through it outside every blast window.
    /// </summary>
    private static Direction FindSafeDirection(Actor bot, GameSession session, DangerMap danger, float stepTime, int maxSteps)
    {
        var queue = new Queue<(int X, int Y, Direction First, int Depth)>();
        var visited = new HashSet<(int, int)> { (bot.X, bot.Y) };
        queue.Enqueue((bot.X, bot.Y, Direction.None, 0));

        while (queue.Count > 0)
        {
            var (x, y, firstDir, depth) = queue.Dequeue();
            if (depth >= maxSteps)
            {
                continue;
            }

            foreach (var dir in Cardinals)
            {
                var path = Slide(session, bot, (x, y), dir);
                if (path.Count == 0 || visited.Contains(path[^1]))
                {
                    continue;
                }

                // Every cell crossed (ice slides cross several) must be clear while the bot is on it.
                var blocked = false;
                for (var i = 0; i < path.Count - 1 && !blocked; i++)
                {
                    blocked = danger.Overlaps(path[i], (depth + i) * stepTime, (depth + i + 1) * stepTime);
                }

                if (blocked)
                {
                    continue;
                }

                var next = path[^1];
                var arrival = depth + path.Count - 1;
                var stepDir = firstDir == Direction.None ? dir : firstDir;
                if (!danger.IsDanger(next))
                {
                    return stepDir;
                }

                if (danger.Overlaps(next, arrival * stepTime, (arrival + 1) * stepTime))
                {
                    continue;
                }

                visited.Add(next);
                queue.Enqueue((next.Item1, next.Item2, stepDir, arrival + 1));
            }
        }

        return Direction.None;
    }

    private bool CanEscapeAfterBomb(Actor bot, GameSession session, DangerMap danger)
    {
        var simulated = danger.WithBomb(session, bot.X, bot.Y, bot.BlastRange, bot.HasPierce, Bomb.DefaultFuse);
        return FindSafeDirection(bot, session, simulated, StepTime(bot), maxSteps: 12) != Direction.None;
    }

    /// <summary>Cells the bot passes through when stepping that way; on ice it keeps sliding.</summary>
    private static List<(int X, int Y)> Slide(GameSession session, Actor bot, (int X, int Y) from, Direction dir)
    {
        var path = new List<(int X, int Y)>();
        var (dx, dy) = dir.ToOffset();
        var current = from;
        while (path.Count < 30)
        {
            var next = (current.X + dx, current.Y + dy);
            if (!CanStand(session, bot, next.Item1, next.Item2))
            {
                break;
            }

            path.Add(next);
            current = next;
            if (!session.Map.IsIce(current.X, current.Y))
            {
                break;
            }
        }

        return path;
    }

    private static bool CanStand(GameSession session, Actor bot, int x, int y)
    {
        if (!session.Map.IsWalkable(x, y))
        {
            return false;
        }

        return !session.Bombs.Any(b => !b.Exploded && !b.IsFlying && b.X == x && b.Y == y && !b.PassThrough.Contains(bot.Id));
    }

    /// <summary>For each threatened cell, the time windows (seconds from now) when it is deadly.</summary>
    private sealed class DangerMap
    {
        private const float Forever = 999f;
        private readonly Dictionary<(int X, int Y), List<(float Start, float End)>> _windows = new();

        public bool IsDanger((int X, int Y) cell) => _windows.ContainsKey(cell);

        public bool Overlaps((int X, int Y) cell, float from, float to) =>
            _windows.TryGetValue(cell, out var list) && list.Any(w => from < w.End + 0.1f && to > w.Start - 0.15f);

        private void Add((int X, int Y) cell, float start, float end)
        {
            if (!_windows.TryGetValue(cell, out var list))
            {
                list = [];
                _windows[cell] = list;
            }

            list.Add((start, end));
        }

        public DangerMap WithBomb(GameSession session, int x, int y, int range, bool pierce, float fuse)
        {
            var copy = new DangerMap();
            foreach (var (cell, list) in _windows)
            {
                copy._windows[cell] = [.. list];
            }

            // If the new bomb sits in an existing blast it goes off with that one.
            if (_windows.TryGetValue((x, y), out var here))
            {
                fuse = Math.Min(fuse, here.Where(w => w.End < Forever).Select(w => w.Start).DefaultIfEmpty(fuse).Min());
            }

            foreach (var (bx, by, _) in session.ComputeBlastCells(x, y, range, pierce))
            {
                copy.Add((bx, by), fuse, fuse + ExplosionCell.Duration);
            }

            return copy;
        }

        public static DangerMap Build(GameSession session, Actor bot, float fuseAwareness, bool fearMonsters)
        {
            var map = new DangerMap();
            foreach (var explosion in session.Explosions)
            {
                map.Add((explosion.X, explosion.Y), 0f, explosion.TimeRemaining);
            }

            var bombs = session.Bombs.Where(b => !b.Exploded && !b.IsFlying).ToList();
            var blasts = bombs.ToDictionary(b => b, b => session.ComputeBlastCells(b.X, b.Y, b.Range, b.Pierce).Select(c => (c.X, c.Y)).ToHashSet());

            // Remote bombs can go off at any moment: rivals' ones count as nearly lit; our own
            // behave like normal bombs because we only detonate them once we are clear.
            var fuse = bombs.ToDictionary(b => b, b => !b.Remote
                ? b.FuseRemaining
                : b.OwnerId == bot.Id ? Math.Max(0.6f, Bomb.DefaultFuse - b.Age) : Math.Min(b.FuseRemaining, 0.7f));

            // Chain reactions: a bomb inside another blast explodes no later than that one.
            for (var changed = true; changed;)
            {
                changed = false;
                foreach (var a in bombs)
                {
                    foreach (var b in bombs)
                    {
                        if (a != b && fuse[b] < fuse[a] && blasts[b].Contains((a.X, a.Y)))
                        {
                            fuse[a] = fuse[b];
                            changed = true;
                        }
                    }
                }
            }

            foreach (var bomb in bombs)
            {
                if (bomb.OwnerId != bot.Id && fuse[bomb] > fuseAwareness)
                {
                    continue;
                }

                foreach (var cell in blasts[bomb])
                {
                    map.Add(cell, fuse[bomb], fuse[bomb] + ExplosionCell.Duration);
                }
            }

            if (fearMonsters)
            {
                foreach (var monster in session.Monsters.Where(m => m.IsAlive))
                {
                    map.Add((monster.X, monster.Y), 0f, Forever);
                    foreach (var dir in Cardinals)
                    {
                        var (dx, dy) = dir.ToOffset();
                        map.Add((monster.X + dx, monster.Y + dy), 0f, Forever);
                    }
                }
            }

            if (session.IsShrinking)
            {
                // Stay off the outermost ring that is still open; it is next to be crushed.
                var tiles = session.Map;
                var ring = OuterOpenRing(tiles);
                foreach (var (x, y) in tiles.Cells())
                {
                    var depth = Math.Min(Math.Min(x, y), Math.Min(tiles.Width - 1 - x, tiles.Height - 1 - y));
                    if (depth <= ring && tiles.IsWalkable(x, y))
                    {
                        // Starts slightly in the future so a bot can still cross the ring to get inside.
                        map.Add((x, y), 0.8f, Forever);
                    }
                }
            }

            return map;
        }

        private static int OuterOpenRing(TileMap map)
        {
            for (var k = 1; k < Math.Min(map.Width, map.Height) / 2; k++)
            {
                for (var x = k; x < map.Width - k; x++)
                {
                    if (map.Get(x, k) != TileType.Wall || map.Get(x, map.Height - 1 - k) != TileType.Wall)
                    {
                        return k;
                    }
                }

                for (var y = k; y < map.Height - k; y++)
                {
                    if (map.Get(k, y) != TileType.Wall || map.Get(map.Width - 1 - k, y) != TileType.Wall)
                    {
                        return k;
                    }
                }
            }

            return 0;
        }
    }
}
