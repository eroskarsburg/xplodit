namespace Xplodit.Game.Models;

public enum PowerUpType : byte
{
    ExtraBomb = 0,
    BlastRange = 1,
    KickBomb = 2,
    Speed = 3,
    Shield = 4,
    Life = 5,
    Pierce = 6,
    Ghost = 7,
    Curse = 8,
    Glove = 9,
    Remote = 10
}

public enum CurseType : byte
{
    None = 0,
    Slow = 1,
    Reverse = 2,
    AutoBomb = 3
}
