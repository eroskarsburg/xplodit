using Xplodit.Game.Characters;

namespace Xplodit.Game.Models;

/// <summary>What a bomber wears: one cosmetic id per slot plus the tint colors.</summary>
public sealed class CharacterLoadout
{
    public string SkinColor { get; set; } = "#FFD3A5";
    public string HairColor { get; set; } = "#5C3A21";
    public string HatColor { get; set; } = "#E63946";
    public string PrimaryColor { get; set; } = "#3A86FF";
    public string SecondaryColor { get; set; } = "#22223B";

    public string Hat { get; set; } = "cap";
    public string Hair { get; set; } = "short";
    public string Face { get; set; } = "happy";
    public string Eyewear { get; set; } = "none";
    public string Top { get; set; } = "tee";
    public string Bottom { get; set; } = "pants";
    public string Shoes { get; set; } = "sneakers";
    public string Back { get; set; } = "none";
    public string BombSkin { get; set; } = "classic";
    public string Trail { get; set; } = "none";
    public string Dance { get; set; } = "wave";

    public string Get(CosmeticSlot slot) => slot switch
    {
        CosmeticSlot.Hat => Hat,
        CosmeticSlot.Hair => Hair,
        CosmeticSlot.Face => Face,
        CosmeticSlot.Eyewear => Eyewear,
        CosmeticSlot.Top => Top,
        CosmeticSlot.Bottom => Bottom,
        CosmeticSlot.Shoes => Shoes,
        CosmeticSlot.Back => Back,
        CosmeticSlot.BombSkin => BombSkin,
        CosmeticSlot.Trail => Trail,
        CosmeticSlot.Dance => Dance,
        _ => string.Empty
    };

    public void Set(CosmeticSlot slot, string id)
    {
        switch (slot)
        {
            case CosmeticSlot.Hat: Hat = id; break;
            case CosmeticSlot.Hair: Hair = id; break;
            case CosmeticSlot.Face: Face = id; break;
            case CosmeticSlot.Eyewear: Eyewear = id; break;
            case CosmeticSlot.Top: Top = id; break;
            case CosmeticSlot.Bottom: Bottom = id; break;
            case CosmeticSlot.Shoes: Shoes = id; break;
            case CosmeticSlot.Back: Back = id; break;
            case CosmeticSlot.BombSkin: BombSkin = id; break;
            case CosmeticSlot.Trail: Trail = id; break;
            case CosmeticSlot.Dance: Dance = id; break;
        }
    }

    /// <summary>Replaces unknown ids (e.g. from an older save) with the slot's first free item.</summary>
    public void Sanitize()
    {
        foreach (var slot in CosmeticCatalog.Slots)
        {
            if (CosmeticCatalog.Find(slot, Get(slot)) is null)
            {
                Set(slot, CosmeticCatalog.InSlot(slot).First(i => i.IsFree).Id);
            }
        }
    }

    public CharacterLoadout Clone() => (CharacterLoadout)MemberwiseClone();
}
