using Xplodit.Game.Characters;
using Xplodit.Game.Maps;
using Xplodit.Game.Models;

namespace Xplodit.Game.Tests;

public class CatalogTests
{
    [Fact]
    public void Shop_has_over_120_items_with_unique_keys()
    {
        Assert.True(CosmeticCatalog.All.Count >= 120);
        Assert.Equal(CosmeticCatalog.All.Count, CosmeticCatalog.All.Select(i => i.Key).Distinct().Count());
    }

    [Fact]
    public void Every_slot_has_items_and_a_free_one()
    {
        foreach (var slot in CosmeticCatalog.Slots)
        {
            Assert.Contains(CosmeticCatalog.InSlot(slot), i => i.IsFree);
        }
    }

    [Theory]
    [InlineData(0, Rarity.Comum)]
    [InlineData(150, Rarity.Comum)]
    [InlineData(300, Rarity.Raro)]
    [InlineData(600, Rarity.Epico)]
    [InlineData(1200, Rarity.Lendario)]
    public void Rarity_follows_price(int price, Rarity expected)
    {
        Assert.Equal(expected, new CosmeticItem("x", CosmeticSlot.Hat, "X", price).Rarity);
    }

    [Fact]
    public void Sanitize_replaces_unknown_items_with_a_free_one()
    {
        var loadout = new CharacterLoadout { Hat = "does-not-exist", Top = "old-armor" };
        loadout.Sanitize();

        foreach (var slot in CosmeticCatalog.Slots)
        {
            Assert.NotNull(CosmeticCatalog.Find(slot, loadout.Get(slot)));
        }

        Assert.True(CosmeticCatalog.Find(CosmeticSlot.Hat, loadout.Hat)!.IsFree);
    }

    [Fact]
    public void Bot_loadouts_only_use_catalog_items()
    {
        var random = new Random(7);
        for (var i = 0; i < 50; i++)
        {
            var loadout = CharacterCatalog.CreateBotLoadout(random);
            foreach (var slot in CosmeticCatalog.Slots)
            {
                Assert.NotNull(CosmeticCatalog.Find(slot, loadout.Get(slot)));
            }
        }
    }

    [Fact]
    public void Generated_maps_are_25_by_19_with_walls_around_and_clear_spawns()
    {
        foreach (var map in MapCatalog.All)
        {
            var (rows, _) = MapGenerator.Generate(map, new Random(1), map.SoftChance, map.IceChance);
            Assert.Equal(19, rows.Length);
            Assert.All(rows, r => Assert.Equal(25, r.Length));
            Assert.All(rows, r => Assert.True(r[0] == '#' && r[^1] == '#'));
            Assert.DoesNotContain(rows[0], c => c != '#');

            foreach (var (x, y) in map.Spawns)
            {
                Assert.Equal('.', rows[y][x]);
            }
        }
    }
}
