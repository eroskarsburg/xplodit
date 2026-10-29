using Xplodit.Game.Models;

namespace Xplodit.Game.Characters;

public static class CharacterCatalog
{
    public static IReadOnlyList<string> SkinColors { get; } =
    [
        "#FFE0BD", "#FFD3A5", "#F1C27D", "#E0AC69", "#C68642", "#8D5524", "#5C3A21",
        "#A0E7E5", "#B4F8C8", "#FBE7C6", "#CDB4DB", "#FF9AA2"
    ];

    public static IReadOnlyList<string> HairColors { get; } =
    [
        "#1B1B2F", "#5C3A21", "#A0522D", "#F4D35E", "#FF7F11", "#E63946",
        "#F8F9FA", "#8E9AAF", "#FF70A6", "#7B2CBF", "#3A86FF", "#2EC4B6"
    ];

    public static IReadOnlyList<string> ClothingColors { get; } =
    [
        "#E63946", "#FF7F11", "#FFBE0B", "#F4D35E", "#8AC926", "#2EC4B6",
        "#06AED5", "#3A86FF", "#4361EE", "#7B2CBF", "#B5179E", "#FF70A6",
        "#FFAFCC", "#CDB4DB", "#A0E7E5", "#B4F8C8", "#F8F9FA", "#ADB5BD",
        "#6C757D", "#22223B", "#1B1B2F", "#8B5A2B", "#E9C46A", "#264653"
    ];

    /// <summary>Team colors used for paint, HUD and outlines (player slot order).</summary>
    public static IReadOnlyList<string> SlotColors { get; } = ["#FFBA08", "#4CC9F0", "#F72585", "#80ED99"];

    public static IReadOnlyList<string> BotNames { get; } = ["Faísca", "Pavio", "Brasa", "Trovão", "Fumaça", "Pólvora", "Estopim", "Rojão"];

    public static CharacterLoadout CreateDefault(int playerIndex = 0) => playerIndex == 0
        ? new CharacterLoadout()
        : new CharacterLoadout
        {
            SkinColor = SkinColors[3],
            HairColor = HairColors[3],
            HatColor = ClothingColors[4],
            PrimaryColor = ClothingColors[2],
            SecondaryColor = ClothingColors[9],
            Hat = "none",
            Hair = "spiky",
            Face = "angry",
            Top = "stripes",
            Bottom = "shorts"
        };

    /// <summary>Bots dress up with random items from the whole shop, so every match looks different.</summary>
    public static CharacterLoadout CreateBotLoadout(Random random)
    {
        var loadout = new CharacterLoadout
        {
            SkinColor = Pick(SkinColors, random),
            HairColor = Pick(HairColors, random),
            HatColor = Pick(ClothingColors, random),
            PrimaryColor = Pick(ClothingColors, random),
            SecondaryColor = Pick(ClothingColors, random)
        };

        foreach (var slot in CosmeticCatalog.Slots)
        {
            var options = CosmeticCatalog.InSlot(slot).ToList();
            loadout.Set(slot, options[random.Next(options.Count)].Id);
        }

        // Bots keep a recognizable face instead of an empty one.
        if (loadout.Hat is "none" && loadout.Hair is "none")
        {
            loadout.Hair = "spiky";
        }

        return loadout;
    }

    private static string Pick(IReadOnlyList<string> list, Random random) => list[random.Next(list.Count)];
}
