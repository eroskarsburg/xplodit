namespace Xplodit.Game.Maps;

public static class MapCatalog
{
    public static IReadOnlyList<MapDefinition> All { get; } =
    [
        new()
        {
            Id = "praia",
            ThemeId = "praia",
            Name = "Praia",
            Description = "Areia quentinha, guarda-sóis e caranguejos curiosos. Arena clássica de pilares.",
            AccentColor = "#FF9F1C",
            FloorColor = "#FFD166",
            WallColor = "#06AED5",
            SoftBlockColor = "#E07A5F",
            Layout = MapLayout.Pillars,
            SoftChance = 0.62
        },
        new()
        {
            Id = "brinquedoteca",
            ThemeId = "brinquedos",
            Name = "Brinquedoteca",
            Description = "Blocos de montar gigantes e corredores que mudam a cada rodada.",
            AccentColor = "#FF5D8F",
            FloorColor = "#9BF6FF",
            WallColor = "#FF5D8F",
            SoftBlockColor = "#FFB703",
            Layout = MapLayout.Rooms,
            SoftChance = 0.55
        },
        new()
        {
            Id = "floresta",
            ThemeId = "floresta",
            Name = "Floresta",
            Description = "Clareira aberta no centro, cercada por cogumelos e troncos.",
            AccentColor = "#2EC4B6",
            FloorColor = "#8FD694",
            WallColor = "#3A7D44",
            SoftBlockColor = "#A0522D",
            Layout = MapLayout.Ring,
            SoftChance = 0.66
        },
        new()
        {
            Id = "geleira",
            ThemeId = "geleira",
            Name = "Geleira",
            Description = "Placas de gelo escorregadias e iglus. Cuidado para não deslizar no fogo!",
            AccentColor = "#48CAE4",
            FloorColor = "#E0FBFC",
            WallColor = "#3D7EAA",
            SoftBlockColor = "#7FC8F8",
            Layout = MapLayout.Scattered,
            IceChance = 0.3,
            SoftChance = 0.58
        },
        new()
        {
            Id = "vulcao",
            ThemeId = "vulcao",
            Name = "Vulcão",
            Description = "Rocha quente, rios de lava e corredores estreitos.",
            AccentColor = "#FF4D00",
            FloorColor = "#5C3A2E",
            WallColor = "#3B2420",
            SoftBlockColor = "#B5562A",
            Layout = MapLayout.Rooms,
            SoftChance = 0.6
        },
        new()
        {
            Id = "doceria",
            ThemeId = "doces",
            Name = "Doceria",
            Description = "Chão de biscoito, pirulitos e bolos para explodir. Tudo cheira a açúcar!",
            AccentColor = "#FF70A6",
            FloorColor = "#FFE5EC",
            WallColor = "#FF70A6",
            SoftBlockColor = "#C08552",
            Layout = MapLayout.Pillars,
            SoftChance = 0.64
        },
        new()
        {
            Id = "lua",
            ThemeId = "lua",
            Name = "Estação Lunar",
            Description = "Crateras, antenas e uma cratera aberta no meio. Pouca gravidade, muita explosão.",
            AccentColor = "#9D4EDD",
            FloorColor = "#C9C9D6",
            WallColor = "#3C3C64",
            SoftBlockColor = "#8D99AE",
            Layout = MapLayout.Ring,
            SoftChance = 0.6
        },
        new()
        {
            Id = "navio",
            ThemeId = "navio",
            Name = "Navio Pirata",
            Description = "Convés de madeira, barris e canhões. Arrr, cuidado com as tábuas!",
            AccentColor = "#E9C46A",
            FloorColor = "#C8945C",
            WallColor = "#5B3A29",
            SoftBlockColor = "#8B5A2B",
            Layout = MapLayout.Scattered,
            SoftChance = 0.6
        }
    ];

    public static MapDefinition GetById(string id) =>
        All.FirstOrDefault(m => string.Equals(m.Id, id, StringComparison.OrdinalIgnoreCase)) ?? All[0];
}

public static class MapGenerator
{
    /// <summary>Builds a fresh layout for one round. Every spawn keeps an L-shaped pocket free of blocks.</summary>
    public static (string[] Rows, bool[,] Ice) Generate(MapDefinition def, Random rng, double softChance, double iceChance)
    {
        var w = def.Width;
        var h = def.Height;
        var grid = new char[h][];
        for (var y = 0; y < h; y++)
        {
            grid[y] = new char[w];
            for (var x = 0; x < w; x++)
            {
                grid[y][x] = '.';
            }
        }

        var spawns = def.Spawns;
        bool NearSpawn(int x, int y, int radius) =>
            spawns.Any(s => Math.Abs(s.X - x) + Math.Abs(s.Y - y) <= radius);

        int cx0 = w / 2 - 4, cx1 = w / 2 + 4, cy0 = h / 2 - 3, cy1 = h / 2 + 3;
        bool InCenter(int x, int y) => x >= cx0 && x <= cx1 && y >= cy0 && y <= cy1;

        for (var y = 0; y < h; y++)
        {
            for (var x = 0; x < w; x++)
            {
                if (x == 0 || y == 0 || x == w - 1 || y == h - 1)
                {
                    grid[y][x] = '#';
                    continue;
                }

                var pillar = x % 2 == 0 && y % 2 == 0;
                if (!pillar)
                {
                    continue;
                }

                grid[y][x] = def.Layout switch
                {
                    MapLayout.Ring when InCenter(x, y) => '.',
                    MapLayout.Scattered => rng.NextDouble() < 0.6 ? '#' : '.',
                    _ => '#'
                };
            }
        }

        if (def.Layout == MapLayout.Rooms)
        {
            // Join pillars horizontally on even rows. Odd rows stay fully open, so each even
            // row only needs one open gap to keep the arena connected; we keep at least three.
            for (var y = 2; y < h - 1; y += 2)
            {
                var gaps = Enumerable.Range(0, w).Where(x => x % 2 == 1 && x > 0 && x < w - 1).ToList();
                var keepOpen = gaps.OrderBy(_ => rng.Next()).Take(3).ToHashSet();
                foreach (var x in gaps)
                {
                    if (keepOpen.Contains(x) || NearSpawn(x, y, 3))
                    {
                        continue;
                    }

                    if (rng.NextDouble() < 0.38)
                    {
                        grid[y][x] = '#';
                    }
                }
            }
        }

        for (var y = 1; y < h - 1; y++)
        {
            for (var x = 1; x < w - 1; x++)
            {
                if (grid[y][x] != '.' || NearSpawn(x, y, 2))
                {
                    continue;
                }

                var chance = def.Layout == MapLayout.Ring && InCenter(x, y) ? softChance * 0.45 : softChance;
                if (rng.NextDouble() < chance)
                {
                    grid[y][x] = 'B';
                }
            }
        }

        var ice = new bool[w, h];
        if (iceChance > 0)
        {
            var target = (int)((w - 2) * (h - 2) * iceChance);
            var placed = 0;
            var guard = 0;
            while (placed < target && guard++ < 400)
            {
                var px = rng.Next(1, w - 1);
                var py = rng.Next(1, h - 1);
                var radius = rng.Next(1, 3);
                for (var dy = -radius; dy <= radius; dy++)
                {
                    for (var dx = -radius; dx <= radius; dx++)
                    {
                        var x = px + dx;
                        var y = py + dy;
                        if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1 || ice[x, y] || NearSpawn(x, y, 1))
                        {
                            continue;
                        }

                        if (Math.Abs(dx) + Math.Abs(dy) <= radius + 1)
                        {
                            ice[x, y] = true;
                            placed++;
                        }
                    }
                }
            }
        }

        return (grid.Select(r => new string(r)).ToArray(), ice);
    }
}
