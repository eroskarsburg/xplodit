using Xplodit.Game.AI;
using Xplodit.Game.Characters;
using Xplodit.Game.Maps;
using Xplodit.Game.Models;

namespace Xplodit.Game;

public sealed class GameSession
{
    public const float CountdownSeconds = 3f;
    public const float RoundOverMinSeconds = 1.5f;
    public const float RoundOverAutoSeconds = 7f;

    private static readonly Direction[] Cardinals = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

    private readonly Random _random;
    private readonly BotController _bots;
    private readonly List<(int X, int Y)> _shrinkOrder = [];
    private readonly List<GameEvent> _events = [];
    private int _shrinkIndex;
    private float _shrinkTimer;
    private float _starSpawnTimer;
    private float _bombRainTimer;
    private float _endGrace = -1f;
    private int _nextBombId = 1;
    private int _nextMonsterId = 1;

    public MatchSettings Settings { get; }
    public MapDefinition MapDefinition { get; }
    public TileMap Map { get; private set; } = null!;
    public List<Actor> Actors { get; } = [];
    public List<Bomb> Bombs { get; } = [];
    public List<ExplosionCell> Explosions { get; } = [];
    public List<PowerUp> PowerUps { get; } = [];
    public List<Collectible> Collectibles { get; } = [];
    public List<Monster> Monsters { get; } = [];

    public MatchPhase Phase { get; private set; }
    public int Round { get; private set; }
    public float PhaseTimer { get; private set; }
    public float TimeRemaining { get; private set; }
    public float ElapsedSeconds { get; private set; }
    public bool IsPaused { get; private set; }
    public bool IsShrinking { get; private set; }
    public int? RoundWinnerId { get; private set; }

    public IEnumerable<Actor> Humans => Actors.Where(a => a.IsHuman);

    /// <summary>All local players are out for good; the round can be fast-forwarded.</summary>
    public bool HumansOut => Humans.All(h => !h.IsAlive && !h.IsRespawning);

    public bool IsMatchDecided
    {
        get
        {
            var needed = Settings.Rounds / 2 + 1;
            return Round >= Settings.Rounds || Actors.Any(a => a.RoundWins >= needed);
        }
    }

    public IReadOnlyList<Actor> Standings => Actors
        .OrderByDescending(a => a.RoundWins)
        .ThenByDescending(a => a.MatchScore)
        .ToList();

    public GameSession(MapDefinition mapDefinition, MatchSettings settings, IReadOnlyList<CharacterLoadout> humanLoadouts, int? seed = null)
    {
        _random = seed.HasValue ? new Random(seed.Value) : new Random();
        Settings = settings.Clone();
        Settings.Normalize();
        MapDefinition = mapDefinition;
        _bots = new BotController(Settings.Difficulty, seed);
        CreateActors(humanLoadouts);
        StartRound();
    }

    public IReadOnlyList<GameEvent> DrainEvents()
    {
        if (_events.Count == 0)
        {
            return [];
        }

        var copy = _events.ToArray();
        _events.Clear();
        return copy;
    }

    private void Emit(string kind, float x, float y, string? text = null, string? color = null) =>
        _events.Add(new GameEvent(kind, x, y, text, color));

    // ---------------------------------------------------------------- setup

    private void CreateActors(IReadOnlyList<CharacterLoadout> humanLoadouts)
    {
        var botNames = CharacterCatalog.BotNames.OrderBy(_ => _random.Next()).ToList();
        var id = 0;
        for (var i = 0; i < Settings.HumanPlayers; i++, id++)
        {
            var loadout = i < humanLoadouts.Count ? humanLoadouts[i] : CharacterCatalog.CreateDefault(i);
            Actors.Add(new Actor
            {
                Id = id,
                Name = Settings.HumanPlayers == 1 ? "Você" : $"Jogador {i + 1}",
                IsHuman = true,
                PlayerIndex = i,
                Color = CharacterCatalog.SlotColors[id],
                Loadout = loadout.Clone()
            });
        }

        for (var b = 0; b < Settings.Bots; b++, id++)
        {
            Actors.Add(new Actor
            {
                Id = id,
                Name = botNames[b % botNames.Count],
                IsHuman = false,
                Color = CharacterCatalog.SlotColors[id],
                Loadout = CharacterCatalog.CreateBotLoadout(_random)
            });
        }
    }

    private void StartRound()
    {
        Round++;
        var softChance = Settings.Mode == GameMode.CoinRush ? MapDefinition.SoftChance * 0.55 : MapDefinition.SoftChance;
        var iceChance = Settings.Mode == GameMode.IceAge ? Math.Max(MapDefinition.IceChance, 0.28) : MapDefinition.IceChance;
        var (rows, ice) = MapGenerator.Generate(MapDefinition, _random, softChance, iceChance);
        Map = new TileMap(MapDefinition, rows, ice);

        Bombs.Clear();
        Explosions.Clear();
        PowerUps.Clear();
        Collectibles.Clear();
        Monsters.Clear();
        _events.Clear();

        var spawns = MapDefinition.Spawns;
        var lives = Settings.RespawnsOnDeath ? 1 : Settings.StartingLives;
        for (var i = 0; i < Actors.Count; i++)
        {
            var (sx, sy) = spawns[i];
            Actors[i].ResetForRound(sx, sy, lives);
        }

        BuildShrinkOrder();
        _shrinkIndex = 0;
        _shrinkTimer = 0f;
        IsShrinking = false;
        _starSpawnTimer = 1.5f;
        _bombRainTimer = 0f;
        _endGrace = -1f;
        RoundWinnerId = null;
        TimeRemaining = Settings.RoundDuration;
        ElapsedSeconds = 0f;

        if (Settings.Mode == GameMode.CoinRush)
        {
            SeedCoins();
        }

        var monsterCount = Settings.Mode == GameMode.CoinRush ? Math.Max(4, Settings.Monsters) : Settings.Monsters;
        for (var i = 0; i < monsterCount; i++)
        {
            SpawnMonster();
        }

        _bots.Reset();
        Phase = MatchPhase.Countdown;
        PhaseTimer = CountdownSeconds;
        Emit("round", Map.Width / 2f, Map.Height / 2f, $"Rodada {Round}");
    }

    private void SeedCoins()
    {
        foreach (var (x, y) in Map.Cells())
        {
            if (!Map.IsWalkable(x, y) || NearAnySpawn(x, y, 1))
            {
                continue;
            }

            Collectibles.Add(new Collectible { X = x, Y = y, Kind = CollectibleKind.Coin });
        }

        var big = Collectibles.OrderBy(_ => _random.Next()).Take(4).ToList();
        foreach (var coin in big)
        {
            Collectibles.Remove(coin);
            Collectibles.Add(new Collectible { X = coin.X, Y = coin.Y, Kind = CollectibleKind.BigCoin });
        }
    }

    private bool NearAnySpawn(int x, int y, int radius) =>
        MapDefinition.Spawns.Any(s => Math.Abs(s.X - x) + Math.Abs(s.Y - y) <= radius);

    private void BuildShrinkOrder()
    {
        _shrinkOrder.Clear();
        var w = Map.Width;
        var h = Map.Height;
        for (var k = 1; h - 2 * k > 3 && w - 2 * k > 3; k++)
        {
            int left = k, right = w - 1 - k, top = k, bottom = h - 1 - k;
            for (var x = left; x <= right; x++) _shrinkOrder.Add((x, top));
            for (var y = top + 1; y <= bottom; y++) _shrinkOrder.Add((right, y));
            for (var x = right - 1; x >= left; x--) _shrinkOrder.Add((x, bottom));
            for (var y = bottom - 1; y > top; y--) _shrinkOrder.Add((left, y));
        }
    }

    // ---------------------------------------------------------------- main loop

    public void Update(float dt, GameInput input)
    {
        if (input.TogglePause && Phase is MatchPhase.Playing or MatchPhase.Countdown)
        {
            IsPaused = !IsPaused;
        }

        input.TogglePause = false;
        if (IsPaused)
        {
            ClearOneShotInput(input);
            return;
        }

        switch (Phase)
        {
            case MatchPhase.Countdown:
                PhaseTimer -= dt;
                if (PhaseTimer <= 0f)
                {
                    Phase = MatchPhase.Playing;
                    Emit("go", Map.Width / 2f, Map.Height / 2f, "JÁ!");
                }

                break;

            case MatchPhase.Playing:
                UpdatePlaying(dt, input);
                break;

            case MatchPhase.RoundOver:
                PhaseTimer += dt;
                if ((PhaseTimer >= RoundOverMinSeconds && input.Confirm) || PhaseTimer >= RoundOverAutoSeconds)
                {
                    StartRound();
                }

                break;
        }

        ClearOneShotInput(input);
    }

    private static void ClearOneShotInput(GameInput input)
    {
        input.Confirm = false;
        foreach (var p in input.Players)
        {
            p.PlaceBomb = false;
            p.Detonate = false;
        }
    }

    private void UpdatePlaying(float dt, GameInput input)
    {
        ElapsedSeconds += dt;
        TimeRemaining -= dt;

        UpdateTimers(dt);
        UpdateActorMotion(dt);
        UpdateSlidingBombs(dt);
        UpdateFlyingBombs(dt);
        HandleHumanInput(input);
        _bots.Update(dt, this);
        UpdateMonsters(dt);
        UpdateBombs(dt);
        UpdateExplosions(dt);
        CollectPowerUps();
        CollectCollectibles();
        UpdateModeRules(dt);
        EvaluateRound(dt);
    }

    private void UpdateTimers(float dt)
    {
        foreach (var actor in Actors)
        {
            if (actor.IsRespawning)
            {
                actor.RespawnTimer -= dt;
                if (actor.RespawnTimer <= 0f)
                {
                    Respawn(actor);
                }

                continue;
            }

            if (!actor.IsAlive)
            {
                continue;
            }

            actor.InvulnerableTime = Math.Max(0f, actor.InvulnerableTime - dt);
            if (actor.FrozenTime > 0f)
            {
                actor.FrozenTime = Math.Max(0f, actor.FrozenTime - dt);
                if (actor.FrozenTime <= 0f)
                {
                    Emit("thaw", actor.X, actor.Y);
                }
            }

            // Ghosts keep their power while inside a block so they never get stuck in it.
            if (actor.GhostTime > 0f && Map.Get(actor.X, actor.Y) != TileType.SoftBlock)
            {
                actor.GhostTime = Math.Max(0f, actor.GhostTime - dt);
            }

            if (actor.CurseTime > 0f)
            {
                actor.CurseTime -= dt;
                if (actor.CurseTime <= 0f)
                {
                    actor.Curse = CurseType.None;
                    actor.CurseTime = 0f;
                }
                else if (actor.Curse == CurseType.AutoBomb && !actor.IsMoving)
                {
                    TryPlaceBomb(actor);
                }
            }
        }

        foreach (var p in PowerUps)
        {
            p.Protection = Math.Max(0f, p.Protection - dt);
        }

        foreach (var c in Collectibles)
        {
            c.PickupDelay = Math.Max(0f, c.PickupDelay - dt);
        }
    }

    private void HandleHumanInput(GameInput input)
    {
        foreach (var human in Humans)
        {
            if (!human.IsAlive || human.PlayerIndex < 0 || human.PlayerIndex >= input.Players.Length)
            {
                continue;
            }

            var p = input.Players[human.PlayerIndex];
            var dir = p.MoveDirection;
            if (human.Curse == CurseType.Reverse)
            {
                dir = Opposite(dir);
            }

            if (p.PlaceBomb && !TryThrowBomb(human))
            {
                TryPlaceBomb(human);
            }

            if (p.Detonate)
            {
                Detonate(human);
            }

            if (dir != Direction.None)
            {
                TryMove(human, dir);
            }
        }
    }

    // ---------------------------------------------------------------- movement

    private void UpdateActorMotion(float dt)
    {
        foreach (var actor in Actors.Where(a => a.IsAlive && a.IsMoving))
        {
            var interval = actor.MoveInterval * (Map.IsIce(actor.X, actor.Y) ? 0.7f : 1f);
            actor.MoveProgress = Math.Min(1f, actor.MoveProgress + dt / interval);
            var t = actor.MoveProgress;
            actor.DisplayX = Lerp(actor.MoveFromX, actor.MoveToX, t);
            actor.DisplayY = Lerp(actor.MoveFromY, actor.MoveToY, t);
            if (actor.MoveProgress < 1f)
            {
                continue;
            }

            actor.SyncDisplayToCell();

            // Ice: keep sliding in the same direction until something blocks the way.
            if (Map.IsIce(actor.X, actor.Y) && !actor.IsFrozen)
            {
                var (dx, dy) = actor.Facing.ToOffset();
                var nx = actor.X + dx;
                var ny = actor.Y + dy;
                if (CanOccupy(nx, ny, actor) && !IsFrozenActorAt(nx, ny, actor.Id))
                {
                    BeginActorStep(actor, nx, ny, actor.Facing);
                }
            }
        }
    }

    internal bool TryMove(Actor actor, Direction direction)
    {
        if (!actor.IsAlive || actor.IsMoving || actor.IsFrozen || direction == Direction.None)
        {
            return false;
        }

        var (dx, dy) = direction.ToOffset();
        var nx = actor.X + dx;
        var ny = actor.Y + dy;
        actor.Facing = direction;

        var bomb = Bombs.FirstOrDefault(b => !b.Exploded && !b.IsFlying && b.X == nx && b.Y == ny);
        if (bomb is not null && !bomb.PassThrough.Contains(actor.Id))
        {
            if (actor.CanKick && !bomb.IsSliding && TryKickBomb(bomb, direction))
            {
                Emit("kick", nx, ny);
            }

            return false;
        }

        // Ice Age: bumping into a frozen rival shatters them.
        var frozen = Actors.FirstOrDefault(a => a.IsAlive && a.Id != actor.Id && a.IsFrozen && a.X == nx && a.Y == ny);
        if (frozen is not null)
        {
            Emit("shatter", nx, ny, "CRACK!", "#90E0EF");
            LoseLife(frozen, actor.Id);
            return false;
        }

        if (!CanOccupy(nx, ny, actor))
        {
            return false;
        }

        BeginActorStep(actor, nx, ny, direction);
        return true;
    }

    private bool IsFrozenActorAt(int x, int y, int exceptId) =>
        Actors.Any(a => a.IsAlive && a.Id != exceptId && a.IsFrozen && a.X == x && a.Y == y);

    private static void BeginActorStep(Actor actor, int nx, int ny, Direction direction)
    {
        actor.Facing = direction;
        actor.IsMoving = true;
        actor.MoveProgress = 0f;
        actor.MoveFromX = actor.X;
        actor.MoveFromY = actor.Y;
        actor.MoveToX = nx;
        actor.MoveToY = ny;
        // The logical cell switches immediately so blasts, pickups and bots see where the actor is heading.
        actor.X = nx;
        actor.Y = ny;
    }

    internal bool CanOccupy(int x, int y, Actor mover)
    {
        if (!Map.InBounds(x, y))
        {
            return false;
        }

        var tile = Map.Get(x, y);
        if (tile == TileType.Wall || (tile == TileType.SoftBlock && !mover.IsGhost))
        {
            return false;
        }

        return !Bombs.Any(b => !b.Exploded && !b.IsFlying && b.X == x && b.Y == y && !b.PassThrough.Contains(mover.Id));
    }

    // ---------------------------------------------------------------- bombs

    private bool TryKickBomb(Bomb bomb, Direction direction)
    {
        var (dx, dy) = direction.ToOffset();
        var nx = bomb.X + dx;
        var ny = bomb.Y + dy;
        if (!CanBombEnter(nx, ny, bomb.Id))
        {
            return false;
        }

        StartBombSlide(bomb, direction, nx, ny);
        return true;
    }

    private static void StartBombSlide(Bomb bomb, Direction direction, int toX, int toY)
    {
        bomb.IsSliding = true;
        bomb.SlideDirection = direction;
        bomb.SlideProgress = 0f;
        bomb.SlideFromX = bomb.X;
        bomb.SlideFromY = bomb.Y;
        bomb.SlideToX = toX;
        bomb.SlideToY = toY;
        bomb.X = toX;
        bomb.Y = toY;
        bomb.PassThrough.Clear();
    }

    private void UpdateSlidingBombs(float dt)
    {
        foreach (var bomb in Bombs.Where(b => !b.Exploded && b.IsSliding).ToList())
        {
            bomb.SlideProgress = Math.Min(1f, bomb.SlideProgress + dt / Bomb.SlideDuration);
            bomb.DisplayX = Lerp(bomb.SlideFromX, bomb.SlideToX, bomb.SlideProgress);
            bomb.DisplayY = Lerp(bomb.SlideFromY, bomb.SlideToY, bomb.SlideProgress);
            if (bomb.SlideProgress < 1f)
            {
                continue;
            }

            var (dx, dy) = bomb.SlideDirection.ToOffset();
            var nx = bomb.X + dx;
            var ny = bomb.Y + dy;
            if (CanBombEnter(nx, ny, bomb.Id))
            {
                StartBombSlide(bomb, bomb.SlideDirection, nx, ny);
            }
            else
            {
                bomb.SyncDisplayToCell();
            }
        }
    }

    private bool CanBombEnter(int x, int y, int bombId)
    {
        if (!Map.IsWalkable(x, y))
        {
            return false;
        }

        if (Bombs.Any(b => !b.Exploded && !b.IsFlying && b.Id != bombId && b.X == x && b.Y == y))
        {
            return false;
        }

        if (Actors.Any(a => a.IsAlive && a.X == x && a.Y == y))
        {
            return false;
        }

        return !Monsters.Any(m => m.IsAlive && m.X == x && m.Y == y);
    }

    internal bool TryPlaceBomb(Actor actor)
    {
        if (!actor.CanPlaceBomb)
        {
            return false;
        }

        // While stepping, drop the bomb on whichever cell the actor mostly covers.
        var (cx, cy) = actor.IsMoving && actor.MoveProgress < 0.5f
            ? ((int)actor.MoveFromX, (int)actor.MoveFromY)
            : (actor.X, actor.Y);

        if (Map.Get(cx, cy) != TileType.Empty || Bombs.Any(b => !b.Exploded && b.X == cx && b.Y == cy))
        {
            return false;
        }

        var bomb = new Bomb
        {
            Id = _nextBombId++,
            OwnerId = actor.Id,
            X = cx,
            Y = cy,
            Range = actor.BlastRange,
            Pierce = actor.HasPierce,
            Freeze = Settings.Mode == GameMode.IceAge,
            Remote = actor.HasRemote,
            FuseRemaining = actor.HasRemote ? Bomb.RemoteFuse : Bomb.DefaultFuse
        };
        bomb.SyncDisplayToCell();
        foreach (var a in Actors.Where(a => a.IsAlive && OverlapsCell(a, cx, cy)))
        {
            bomb.PassThrough.Add(a.Id);
        }

        Bombs.Add(bomb);
        actor.ActiveBombs++;
        Emit("place", cx, cy);
        return true;
    }

    private static bool OverlapsCell(Actor a, int x, int y) =>
        (a.X == x && a.Y == y) || (a.IsMoving && (int)a.MoveFromX == x && (int)a.MoveFromY == y);

    private void UpdateBombs(float dt)
    {
        foreach (var bomb in Bombs.Where(b => !b.Exploded))
        {
            bomb.PassThrough.RemoveWhere(id =>
            {
                var a = Actors.FirstOrDefault(x => x.Id == id);
                return a is null || !a.IsAlive || !OverlapsCell(a, bomb.X, bomb.Y);
            });
        }

        var toExplode = new List<Bomb>();
        foreach (var bomb in Bombs.Where(b => !b.Exploded && !b.IsFlying))
        {
            bomb.Age += dt;
            bomb.FuseRemaining -= dt;
            if (bomb.FuseRemaining <= 0f)
            {
                toExplode.Add(bomb);
            }
        }

        foreach (var bomb in toExplode)
        {
            ExplodeBomb(bomb);
        }

        Bombs.RemoveAll(b => b.Exploded);
    }

    private void ExplodeBomb(Bomb bomb)
    {
        if (bomb.Exploded)
        {
            return;
        }

        bomb.Exploded = true;
        bomb.IsSliding = false;
        bomb.SyncDisplayToCell();
        var owner = Actors.FirstOrDefault(a => a.Id == bomb.OwnerId);
        if (owner is not null)
        {
            owner.ActiveBombs = Math.Max(0, owner.ActiveBombs - 1);
        }

        Emit(bomb.Freeze ? "freezeboom" : "boom", bomb.X, bomb.Y);

        var destroyed = new List<(int X, int Y)>();
        foreach (var (x, y, shape) in ComputeBlastCells(bomb.X, bomb.Y, bomb.Range, bomb.Pierce))
        {
            Explosions.Add(new ExplosionCell { X = x, Y = y, OwnerId = bomb.OwnerId, Freeze = bomb.Freeze, Shape = shape });

            if (Map.Get(x, y) == TileType.SoftBlock)
            {
                Map.Set(x, y, TileType.Empty);
                destroyed.Add((x, y));
                if (owner is not null)
                {
                    owner.BlocksDestroyed++;
                    owner.Score += 10;
                }
            }

            Paint(x, y, bomb.OwnerId);

            foreach (var power in PowerUps.Where(p => p.X == x && p.Y == y && p.Protection <= 0f).ToList())
            {
                PowerUps.Remove(power);
                Emit("burn", x, y);
            }

            foreach (var actor in Actors.Where(a => a.IsAlive && a.X == x && a.Y == y).ToList())
            {
                Damage(actor, bomb.OwnerId, bomb.Freeze);
            }

            HitMonstersAt(x, y, bomb.OwnerId);

            foreach (var chained in Bombs.Where(b => !b.Exploded && !b.IsFlying && b.X == x && b.Y == y).ToList())
            {
                ExplodeBomb(chained);
            }
        }

        foreach (var (x, y) in destroyed)
        {
            MaybeDrop(x, y);
        }
    }

    /// <summary>Glove: pressing bomb while standing on one of your bombs throws it three cells ahead.</summary>
    internal bool TryThrowBomb(Actor actor)
    {
        if (!actor.HasGlove || !actor.IsAlive || actor.IsFrozen)
        {
            return false;
        }

        var bomb = Bombs.FirstOrDefault(b => !b.Exploded && !b.IsFlying && !b.IsSliding && OverlapsCell(actor, b.X, b.Y));
        if (bomb is null)
        {
            return false;
        }

        var dir = actor.Facing == Direction.None ? Direction.Down : actor.Facing;
        var (dx, dy) = dir.ToOffset();
        var (tx, ty) = Wrap(bomb.X + dx * 3, bomb.Y + dy * 3);
        StartBombFlight(bomb, dir, tx, ty, Bomb.ThrowDuration);
        Emit("throw", bomb.X, bomb.Y);
        return true;
    }

    private (int X, int Y) Wrap(int x, int y) =>
        (((x % Map.Width) + Map.Width) % Map.Width, ((y % Map.Height) + Map.Height) % Map.Height);

    private static void StartBombFlight(Bomb bomb, Direction dir, int toX, int toY, float duration)
    {
        bomb.IsFlying = true;
        bomb.FlyDirection = dir;
        bomb.FlyProgress = 0f;
        bomb.FlyDuration = duration;
        bomb.SlideFromX = bomb.DisplayX;
        bomb.SlideFromY = bomb.DisplayY;
        bomb.FlyToX = toX;
        bomb.FlyToY = toY;
        bomb.PassThrough.Clear();
    }

    private void UpdateFlyingBombs(float dt)
    {
        foreach (var bomb in Bombs.Where(b => !b.Exploded && b.IsFlying).ToList())
        {
            bomb.FlyProgress = Math.Min(1f, bomb.FlyProgress + dt / bomb.FlyDuration);
            var t = bomb.FlyProgress;
            // A throw that wraps around the arena edge just pops out on the other side.
            var wraps = Math.Abs(bomb.FlyToX - bomb.SlideFromX) > 4 || Math.Abs(bomb.FlyToY - bomb.SlideFromY) > 4;
            bomb.DisplayX = wraps ? bomb.FlyToX : Lerp(bomb.SlideFromX, bomb.FlyToX, t);
            bomb.DisplayY = wraps ? bomb.FlyToY : Lerp(bomb.SlideFromY, bomb.FlyToY, t);
            bomb.FlyHeight = (float)Math.Sin(t * Math.PI) * (bomb.FlyDuration >= Bomb.ThrowDuration ? 1f : 0.4f);
            if (t < 1f)
            {
                continue;
            }

            bomb.X = bomb.FlyToX;
            bomb.Y = bomb.FlyToY;
            if (CanBombEnter(bomb.X, bomb.Y, bomb.Id))
            {
                bomb.IsFlying = false;
                bomb.SyncDisplayToCell();
                bomb.FlyHeight = 0f;
                Emit("land", bomb.X, bomb.Y);
                continue;
            }

            // Blocked landing spot: bounce one cell further (bonking anyone standing there).
            foreach (var victim in Actors.Where(a => a.IsAlive && a.X == bomb.X && a.Y == bomb.Y))
            {
                Emit("bonk", victim.X, victim.Y, "BONK!", "#FFD60A");
            }

            var (dx, dy) = bomb.FlyDirection.ToOffset();
            var (nx, ny) = Wrap(bomb.X + dx, bomb.Y + dy);
            bomb.DisplayX = bomb.X;
            bomb.DisplayY = bomb.Y;
            StartBombFlight(bomb, bomb.FlyDirection, nx, ny, Bomb.BounceDuration);
        }
    }

    /// <summary>Remote control: blows up every remote bomb the actor owns.</summary>
    internal bool Detonate(Actor actor)
    {
        var mine = Bombs.Where(b => !b.Exploded && !b.IsFlying && b.Remote && b.OwnerId == actor.Id).ToList();
        foreach (var bomb in mine)
        {
            ExplodeBomb(bomb);
        }

        if (mine.Count > 0)
        {
            Bombs.RemoveAll(b => b.Exploded);
        }

        return mine.Count > 0;
    }

    internal IEnumerable<(int X, int Y, byte Shape)> ComputeBlastCells(int originX, int originY, int range, bool pierce)
    {
        yield return (originX, originY, 0);
        foreach (var dir in Cardinals)
        {
            var (dx, dy) = dir.ToOffset();
            var shape = (byte)(dx != 0 ? 1 : 2);
            for (var i = 1; i <= range; i++)
            {
                var x = originX + dx * i;
                var y = originY + dy * i;
                if (!Map.InBounds(x, y) || Map.Get(x, y) == TileType.Wall)
                {
                    break;
                }

                yield return (x, y, shape);
                if (Map.Get(x, y) == TileType.SoftBlock && !pierce)
                {
                    break;
                }
            }
        }
    }

    private void Paint(int x, int y, int ownerId)
    {
        if (ownerId < 0)
        {
            return;
        }

        var previous = Map.GetPaint(x, y);
        if (previous == ownerId)
        {
            return;
        }

        if (previous >= 0)
        {
            var prevOwner = Actors.FirstOrDefault(a => a.Id == previous);
            if (prevOwner is not null)
            {
                prevOwner.PaintedTiles--;
            }
        }

        Map.SetPaint(x, y, ownerId);
        var owner = Actors.FirstOrDefault(a => a.Id == ownerId);
        if (owner is not null)
        {
            owner.PaintedTiles++;
        }
    }

    private void MaybeDrop(int x, int y)
    {
        if (Settings.Mode == GameMode.CoinRush)
        {
            var roll = _random.NextDouble();
            if (roll < 0.08)
            {
                Collectibles.Add(new Collectible { X = x, Y = y, Kind = CollectibleKind.BigCoin });
                return;
            }

            if (roll < 0.6)
            {
                Collectibles.Add(new Collectible { X = x, Y = y, Kind = CollectibleKind.Coin });
                return;
            }
        }

        if (_random.NextDouble() > 0.36)
        {
            return;
        }

        var allowLife = Settings.Mode is GameMode.Classic or GameMode.CoinRush or GameMode.IceAge;
        (PowerUpType Type, int Weight)[] table =
        [
            (PowerUpType.ExtraBomb, 22),
            (PowerUpType.BlastRange, 22),
            (PowerUpType.Speed, 14),
            (PowerUpType.KickBomb, 8),
            (PowerUpType.Shield, 8),
            (PowerUpType.Life, allowLife ? 4 : 0),
            (PowerUpType.Pierce, 6),
            (PowerUpType.Ghost, 6),
            (PowerUpType.Curse, 9),
            (PowerUpType.Glove, 6),
            (PowerUpType.Remote, 4)
        ];

        var total = table.Sum(t => t.Weight);
        var pick = _random.Next(total);
        foreach (var (type, weight) in table)
        {
            if (pick < weight)
            {
                PowerUps.Add(new PowerUp { X = x, Y = y, Type = type });
                return;
            }

            pick -= weight;
        }
    }

    private void UpdateExplosions(float dt)
    {
        foreach (var explosion in Explosions)
        {
            explosion.TimeRemaining -= dt;
            foreach (var actor in Actors.Where(a => a.IsAlive && a.X == explosion.X && a.Y == explosion.Y).ToList())
            {
                Damage(actor, explosion.OwnerId, explosion.Freeze);
            }

            HitMonstersAt(explosion.X, explosion.Y, explosion.OwnerId);
        }

        Explosions.RemoveAll(e => e.TimeRemaining <= 0f);
    }

    // ---------------------------------------------------------------- damage

    private void Damage(Actor victim, int attackerId, bool freeze)
    {
        if (!victim.IsAlive || victim.IsInvulnerable)
        {
            return;
        }

        if (victim.HasShield)
        {
            victim.HasShield = false;
            victim.InvulnerableTime = 1.2f;
            Emit("shield", victim.X, victim.Y, "Escudo!", "#80FFDB");
            return;
        }

        if (freeze && !victim.IsFrozen)
        {
            victim.FrozenTime = 3.2f;
            victim.InvulnerableTime = ExplosionCell.Duration + 0.15f;
            Emit("freeze", victim.X, victim.Y, "Congelado!", "#90E0EF");
            return;
        }

        LoseLife(victim, attackerId);
    }

    private void LoseLife(Actor victim, int attackerId)
    {
        if (!victim.IsAlive)
        {
            return;
        }

        victim.HitsTaken++;
        if (attackerId == victim.Id)
        {
            victim.SelfHits++;
        }

        victim.FrozenTime = 0f;
        victim.Curse = CurseType.None;
        victim.CurseTime = 0f;

        var attacker = Actors.FirstOrDefault(a => a.Id == attackerId);
        if (attacker is not null && attacker.Id != victim.Id)
        {
            attacker.Kills++;
            attacker.Score += 100;
            Emit("score", victim.X, victim.Y, "+100", attacker.Color);
        }

        if (Settings.Mode == GameMode.StarCollector && victim.Stars > 0)
        {
            DropStars(victim);
        }

        if (Settings.RespawnsOnDeath)
        {
            victim.IsAlive = false;
            victim.RespawnTimer = 2f;
            victim.SyncDisplayToCell();
            Emit("ko", victim.X, victim.Y);
            return;
        }

        victim.Lives--;
        if (victim.Lives <= 0)
        {
            victim.IsAlive = false;
            victim.SyncDisplayToCell();
            Emit("ko", victim.X, victim.Y, $"{victim.Name} caiu!", victim.Color);
        }
        else
        {
            victim.InvulnerableTime = 2f;
            Emit("hit", victim.X, victim.Y, "-1 ♥", "#FF6B6B");
        }
    }

    private void Eliminate(Actor victim)
    {
        if (!victim.IsAlive)
        {
            return;
        }

        if (Settings.RespawnsOnDeath)
        {
            LoseLife(victim, -1);
            return;
        }

        victim.Lives = 1;
        victim.InvulnerableTime = 0f;
        victim.HasShield = false;
        LoseLife(victim, -1);
    }

    private void DropStars(Actor victim)
    {
        var drop = (victim.Stars + 1) / 2;
        victim.Stars -= drop;
        var cells = FreeCellsAround(victim.X, victim.Y, 3).OrderBy(_ => _random.Next()).ToList();
        for (var i = 0; i < drop && cells.Count > 0; i++)
        {
            var (x, y) = cells[i % cells.Count];
            Collectibles.Add(new Collectible { X = x, Y = y, Kind = CollectibleKind.Star, PickupDelay = 0.8f });
        }

        Emit("drop", victim.X, victim.Y, $"-{drop} ★", "#FFD60A");
    }

    private IEnumerable<(int X, int Y)> FreeCellsAround(int cx, int cy, int radius)
    {
        for (var y = cy - radius; y <= cy + radius; y++)
        {
            for (var x = cx - radius; x <= cx + radius; x++)
            {
                if (Map.IsWalkable(x, y) && !Collectibles.Any(c => c.X == x && c.Y == y))
                {
                    yield return (x, y);
                }
            }
        }
    }

    private void Respawn(Actor actor)
    {
        var (x, y) = (actor.SpawnX, actor.SpawnY);
        if (!Map.IsWalkable(x, y) || Bombs.Any(b => b.X == x && b.Y == y))
        {
            var free = RandomFreeCell(minDistanceFromActors: 3);
            if (free is null)
            {
                actor.RespawnTimer = 0.5f;
                return;
            }

            (x, y) = free.Value;
        }

        actor.X = x;
        actor.Y = y;
        actor.SyncDisplayToCell();
        actor.IsAlive = true;
        actor.RespawnTimer = 0f;
        actor.InvulnerableTime = 2.5f;
        Emit("respawn", x, y);
    }

    private (int X, int Y)? RandomFreeCell(int minDistanceFromActors)
    {
        var candidates = Map.Cells()
            .Where(c => Map.IsWalkable(c.X, c.Y)
                        && !Bombs.Any(b => b.X == c.X && b.Y == c.Y)
                        && !Explosions.Any(e => e.X == c.X && e.Y == c.Y)
                        && Actors.Where(a => a.IsAlive).All(a => Math.Abs(a.X - c.X) + Math.Abs(a.Y - c.Y) >= minDistanceFromActors))
            .ToList();
        return candidates.Count == 0 ? null : candidates[_random.Next(candidates.Count)];
    }

    // ---------------------------------------------------------------- pickups

    private void CollectPowerUps()
    {
        foreach (var actor in Actors.Where(a => a.IsAlive))
        {
            var pickup = PowerUps.FirstOrDefault(p => p.X == actor.X && p.Y == actor.Y);
            if (pickup is null)
            {
                continue;
            }

            PowerUps.Remove(pickup);
            actor.PowerUpsCollected++;
            actor.Score += 25;
            ApplyPowerUp(actor, pickup.Type);
        }
    }

    private void ApplyPowerUp(Actor actor, PowerUpType type)
    {
        string label;
        switch (type)
        {
            case PowerUpType.ExtraBomb:
                actor.MaxBombs = Math.Min(8, actor.MaxBombs + 1);
                label = "+1 Bomba";
                break;
            case PowerUpType.BlastRange:
                actor.BlastRange = Math.Min(9, actor.BlastRange + 1);
                label = "+1 Fogo";
                break;
            case PowerUpType.KickBomb:
                actor.CanKick = true;
                label = "Chute!";
                break;
            case PowerUpType.Speed:
                actor.SpeedLevel = Math.Min(4, actor.SpeedLevel + 1);
                label = "Velocidade!";
                break;
            case PowerUpType.Shield:
                actor.HasShield = true;
                label = "Escudo!";
                break;
            case PowerUpType.Life:
                actor.Lives = Math.Min(5, actor.Lives + 1);
                label = "+1 Vida";
                break;
            case PowerUpType.Pierce:
                actor.HasPierce = true;
                label = "Bomba perfurante!";
                break;
            case PowerUpType.Ghost:
                actor.GhostTime = 8f;
                label = "Fantasma!";
                break;
            case PowerUpType.Glove:
                actor.HasGlove = true;
                label = "Luva: arremesse!";
                break;
            case PowerUpType.Remote:
                actor.HasRemote = true;
                label = "Detonador!";
                break;
            case PowerUpType.Curse:
                actor.Curse = (CurseType)_random.Next(1, 4);
                actor.CurseTime = 8f;
                label = actor.Curse switch
                {
                    CurseType.Slow => "Maldição: lento",
                    CurseType.Reverse => "Maldição: invertido",
                    _ => "Maldição: bombas soltas"
                };
                Emit("curse", actor.X, actor.Y, label, "#C77DFF");
                return;
            default:
                return;
        }

        Emit("power", actor.X, actor.Y, label, actor.Color);
    }

    private void CollectCollectibles()
    {
        foreach (var actor in Actors.Where(a => a.IsAlive))
        {
            var item = Collectibles.FirstOrDefault(c => c.X == actor.X && c.Y == actor.Y && c.PickupDelay <= 0f);
            if (item is null)
            {
                continue;
            }

            Collectibles.Remove(item);
            switch (item.Kind)
            {
                case CollectibleKind.Star:
                    actor.Stars++;
                    actor.Score += 50;
                    Emit("star", item.X, item.Y, "★", "#FFD60A");
                    break;
                case CollectibleKind.Coin:
                    actor.Coins++;
                    actor.Score += 5;
                    Emit("coin", item.X, item.Y);
                    break;
                case CollectibleKind.BigCoin:
                    actor.Coins += 10;
                    actor.Score += 50;
                    Emit("bigcoin", item.X, item.Y, "+10", "#FFD60A");
                    break;
            }
        }
    }

    // ---------------------------------------------------------------- monsters

    private void SpawnMonster()
    {
        var candidates = Map.Cells()
            .Where(c => Map.IsWalkable(c.X, c.Y)
                        && !NearAnySpawn(c.X, c.Y, 6)
                        && Actors.Where(a => a.IsAlive).All(a => Math.Abs(a.X - c.X) + Math.Abs(a.Y - c.Y) >= 6)
                        && !Monsters.Any(m => m.IsAlive && m.X == c.X && m.Y == c.Y))
            .ToList();
        if (candidates.Count == 0)
        {
            return;
        }

        var (x, y) = candidates[_random.Next(candidates.Count)];
        var monster = new Monster { Id = _nextMonsterId++, X = x, Y = y };
        monster.SyncDisplayToCell();
        Monsters.Add(monster);
    }

    private float MonsterInterval => Settings.Difficulty switch
    {
        Difficulty.Easy => 0.46f,
        Difficulty.Hard => 0.3f,
        _ => 0.38f
    };

    private double MonsterChaseChance => Settings.Difficulty switch
    {
        Difficulty.Easy => 0.2,
        Difficulty.Hard => 0.7,
        _ => 0.45
    };

    private void UpdateMonsters(float dt)
    {
        foreach (var monster in Monsters)
        {
            if (!monster.IsAlive)
            {
                if (monster.RespawnTimer > 0f)
                {
                    monster.RespawnTimer -= dt;
                    if (monster.RespawnTimer <= 0f)
                    {
                        RespawnMonster(monster);
                    }
                }

                continue;
            }

            if (monster.IsMoving)
            {
                monster.MoveProgress = Math.Min(1f, monster.MoveProgress + dt / MonsterInterval);
                monster.DisplayX = Lerp(monster.FromX, monster.X, monster.MoveProgress);
                monster.DisplayY = Lerp(monster.FromY, monster.Y, monster.MoveProgress);
            }
            else
            {
                StepMonster(monster);
            }

            foreach (var actor in Actors.Where(a => a.IsAlive && !a.IsInvulnerable))
            {
                if (Math.Abs(actor.DisplayX - monster.DisplayX) < 0.6f && Math.Abs(actor.DisplayY - monster.DisplayY) < 0.6f)
                {
                    Emit("bite", actor.X, actor.Y);
                    Damage(actor, -1, freeze: false);
                }
            }
        }
    }

    private void StepMonster(Monster monster)
    {
        var options = Cardinals
            .Where(d =>
            {
                var (dx, dy) = d.ToOffset();
                var nx = monster.X + dx;
                var ny = monster.Y + dy;
                return Map.IsWalkable(nx, ny)
                       && !Bombs.Any(b => !b.Exploded && b.X == nx && b.Y == ny)
                       && !Monsters.Any(m => m.IsAlive && m.Id != monster.Id && m.X == nx && m.Y == ny);
            })
            .ToList();

        if (options.Count == 0)
        {
            return;
        }

        var reverse = Opposite(monster.Facing);
        if (options.Count > 1)
        {
            options.Remove(reverse);
        }

        Direction choice;
        var target = Actors.Where(a => a.IsAlive)
            .OrderBy(a => Math.Abs(a.X - monster.X) + Math.Abs(a.Y - monster.Y))
            .FirstOrDefault();

        if (target is not null && _random.NextDouble() < MonsterChaseChance)
        {
            choice = options
                .OrderBy(d =>
                {
                    var (dx, dy) = d.ToOffset();
                    return Math.Abs(target.X - (monster.X + dx)) + Math.Abs(target.Y - (monster.Y + dy));
                })
                .First();
        }
        else if (options.Contains(monster.Facing) && _random.NextDouble() < 0.7)
        {
            choice = monster.Facing;
        }
        else
        {
            choice = options[_random.Next(options.Count)];
        }

        var (ox, oy) = choice.ToOffset();
        monster.FromX = monster.X;
        monster.FromY = monster.Y;
        monster.X += ox;
        monster.Y += oy;
        monster.Facing = choice;
        monster.MoveProgress = 0f;
    }

    private void HitMonstersAt(int x, int y, int ownerId)
    {
        foreach (var monster in Monsters.Where(m => m.IsAlive && ((m.X == x && m.Y == y) || (m.IsMoving && m.FromX == x && m.FromY == y))))
        {
            monster.IsAlive = false;
            monster.RespawnTimer = Settings.Mode == GameMode.CoinRush ? 7f : 0f;
            Emit("monster", monster.DisplayX, monster.DisplayY, "+150", "#C77DFF");
            var owner = Actors.FirstOrDefault(a => a.Id == ownerId);
            if (owner is not null)
            {
                owner.Score += 150;
                owner.MonstersDefeated++;
            }
        }
    }

    private void RespawnMonster(Monster monster)
    {
        var free = RandomFreeCell(minDistanceFromActors: 6);
        if (free is null)
        {
            monster.RespawnTimer = 1f;
            return;
        }

        (monster.X, monster.Y) = free.Value;
        monster.SyncDisplayToCell();
        monster.IsAlive = true;
        Emit("respawn", monster.X, monster.Y);
    }

    // ---------------------------------------------------------------- mode rules

    private void UpdateModeRules(float dt)
    {
        if (Settings.Mode == GameMode.StarCollector)
        {
            _starSpawnTimer -= dt;
            var onBoard = Collectibles.Count(c => c.Kind == CollectibleKind.Star);
            if (_starSpawnTimer <= 0f && onBoard < 8)
            {
                var cell = RandomFreeCell(minDistanceFromActors: 2);
                if (cell is not null)
                {
                    Collectibles.Add(new Collectible { X = cell.Value.X, Y = cell.Value.Y, Kind = CollectibleKind.Star });
                    Emit("starspawn", cell.Value.X, cell.Value.Y);
                }

                _starSpawnTimer = 2.2f + (float)_random.NextDouble() * 1.5f;
            }
        }

        var shrinkStarts = Settings.Mode switch
        {
            GameMode.BattleRoyale => ElapsedSeconds >= 25f,
            _ when Settings.IsElimination => TimeRemaining <= 0f,
            _ => false
        };

        if (!shrinkStarts)
        {
            return;
        }

        if (_shrinkIndex >= _shrinkOrder.Count)
        {
            UpdateBombRain(dt);
            return;
        }

        if (!IsShrinking)
        {
            IsShrinking = true;
            Emit("suddendeath", Map.Width / 2f, Map.Height / 2f, "A ARENA ESTÁ FECHANDO!", "#FF4D00");
        }

        var interval = Settings.Mode == GameMode.BattleRoyale ? 0.42f : 0.15f;
        _shrinkTimer -= dt;
        while (_shrinkTimer <= 0f && _shrinkIndex < _shrinkOrder.Count)
        {
            _shrinkTimer += interval;
            CrushCell(_shrinkOrder[_shrinkIndex++]);
        }
    }

    /// <summary>Once the arena is fully closed, ownerless bombs rain on the pocket that is left.</summary>
    private void UpdateBombRain(float dt)
    {
        _bombRainTimer -= dt;
        if (_bombRainTimer > 0f)
        {
            return;
        }

        _bombRainTimer = 1.1f;
        var cells = Map.Cells()
            .Where(c => Map.IsWalkable(c.X, c.Y) && !Bombs.Any(b => b.X == c.X && b.Y == c.Y))
            .ToList();
        if (cells.Count == 0)
        {
            return;
        }

        var (x, y) = cells[_random.Next(cells.Count)];
        var bomb = new Bomb
        {
            Id = _nextBombId++,
            OwnerId = -1,
            X = x,
            Y = y,
            Range = 2,
            FuseRemaining = 1.6f,
            Freeze = Settings.Mode == GameMode.IceAge
        };
        bomb.SyncDisplayToCell();
        foreach (var a in Actors.Where(a => a.IsAlive && OverlapsCell(a, x, y)))
        {
            bomb.PassThrough.Add(a.Id);
        }

        Bombs.Add(bomb);
        Emit("rain", x, y);
    }

    private void CrushCell((int X, int Y) cell)
    {
        var (x, y) = cell;
        if (Map.Get(x, y) == TileType.Wall)
        {
            return;
        }

        Map.Set(x, y, TileType.Wall);
        Emit("crush", x, y);

        foreach (var bomb in Bombs.Where(b => !b.Exploded && b.X == x && b.Y == y).ToList())
        {
            bomb.Exploded = true;
            var owner = Actors.FirstOrDefault(a => a.Id == bomb.OwnerId);
            if (owner is not null)
            {
                owner.ActiveBombs = Math.Max(0, owner.ActiveBombs - 1);
            }
        }

        Bombs.RemoveAll(b => b.Exploded);
        PowerUps.RemoveAll(p => p.X == x && p.Y == y);
        Collectibles.RemoveAll(c => c.X == x && c.Y == y);

        foreach (var actor in Actors.Where(a => a.IsAlive && a.X == x && a.Y == y).ToList())
        {
            Eliminate(actor);
        }

        foreach (var monster in Monsters.Where(m => m.IsAlive && m.X == x && m.Y == y))
        {
            monster.IsAlive = false;
            monster.RespawnTimer = 0f;
        }
    }

    // ---------------------------------------------------------------- round result

    private void EvaluateRound(float dt)
    {
        var alive = Actors.Where(a => a.IsAlive || a.IsRespawning).ToList();

        switch (Settings.Mode)
        {
            case GameMode.StarCollector:
            {
                var champion = Actors.FirstOrDefault(a => a.Stars >= MatchSettings.StarGoal);
                if (champion is not null)
                {
                    FinishRound(champion);
                }
                else if (TimeRemaining <= 0f)
                {
                    FinishRound(BestBy(Actors, a => a.Stars));
                }

                return;
            }

            case GameMode.CoinRush:
            {
                var coinsLeft = Collectibles.Any(c => c.Kind is CollectibleKind.Coin or CollectibleKind.BigCoin);
                if (TimeRemaining <= 0f || alive.Count == 0 || (!coinsLeft && !SoftBlocksRemain()))
                {
                    FinishRound(BestBy(Actors, a => a.Coins));
                }

                return;
            }
        }

        // Elimination modes. A short grace period lets simultaneous knockouts count as a draw.
        if (alive.Count <= 1)
        {
            if (_endGrace < 0f)
            {
                _endGrace = 0.8f;
            }

            _endGrace -= dt;
            if (_endGrace <= 0f)
            {
                var survivors = Actors.Where(a => a.IsAlive).ToList();
                FinishRound(survivors.Count == 1 ? survivors[0] : null);
            }

            return;
        }

        // Overtime safety net: arena fully closed and still a standoff.
        if (_shrinkIndex >= _shrinkOrder.Count && IsShrinking && TimeRemaining < -120f)
        {
            FinishRound(BestBy(alive, a => a.Lives * 10000 + a.Score));
        }
    }

    private bool SoftBlocksRemain() => Map.Cells().Any(c => Map.Get(c.X, c.Y) == TileType.SoftBlock);

    private static Actor? BestBy(IEnumerable<Actor> actors, Func<Actor, int> key)
    {
        var ranked = actors.OrderByDescending(key).ThenByDescending(a => a.Score).ToList();
        if (ranked.Count == 0)
        {
            return null;
        }

        if (ranked.Count > 1 && key(ranked[0]) == key(ranked[1]) && ranked[0].Score == ranked[1].Score)
        {
            return null;
        }

        return ranked[0];
    }

    private void FinishRound(Actor? winner)
    {
        foreach (var actor in Actors)
        {
            actor.Score += actor.PaintedTiles * 2;
        }

        if (winner is not null)
        {
            winner.RoundWins++;
            winner.Score += 300;
        }

        foreach (var actor in Actors)
        {
            actor.MatchScore += actor.Score;
            actor.TotalStars += actor.Stars;
            actor.TotalCoins += actor.Coins;
            actor.MaxPainted = Math.Max(actor.MaxPainted, actor.PaintedTiles);
        }

        RoundWinnerId = winner?.Id;
        PhaseTimer = 0f;
        Phase = IsMatchDecided ? MatchPhase.MatchOver : MatchPhase.RoundOver;
        Emit(Phase == MatchPhase.MatchOver ? "matchover" : "roundover", Map.Width / 2f, Map.Height / 2f);
    }

    // ---------------------------------------------------------------- helpers

    internal static Direction Opposite(Direction d) => d switch
    {
        Direction.Up => Direction.Down,
        Direction.Down => Direction.Up,
        Direction.Left => Direction.Right,
        Direction.Right => Direction.Left,
        _ => Direction.None
    };

    private static float Lerp(float a, float b, float t) => a + (b - a) * t;
}
