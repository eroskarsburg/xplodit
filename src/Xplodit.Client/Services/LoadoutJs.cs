using Xplodit.Game.Models;

namespace Xplodit.Client.Services;

/// <summary>Shape of a loadout as the canvas renderer (gameCanvas.js) expects it.</summary>
public static class LoadoutJs
{
    public static object From(CharacterLoadout l) => new
    {
        skin = l.SkinColor,
        hair = l.HairColor,
        hatColor = l.HatColor,
        primary = l.PrimaryColor,
        secondary = l.SecondaryColor,
        items = new
        {
            hat = l.Hat,
            hair = l.Hair,
            face = l.Face,
            eyewear = l.Eyewear,
            top = l.Top,
            bottom = l.Bottom,
            shoes = l.Shoes,
            back = l.Back,
            bomb = l.BombSkin,
            trail = l.Trail,
            dance = l.Dance
        }
    };
}
