namespace Xplodit.Game.Models;

public enum GameMode : byte
{
    Classic = 0,
    BattleRoyale = 1,
    StarCollector = 2,
    CoinRush = 3,
    IceAge = 4
}

public enum Difficulty : byte
{
    Easy = 0,
    Normal = 1,
    Hard = 2
}

public static class GameModeInfo
{
    public static string Name(GameMode mode) => mode switch
    {
        GameMode.Classic => "Clássico",
        GameMode.BattleRoyale => "Battle Royale",
        GameMode.StarCollector => "Caça-Estrelas",
        GameMode.CoinRush => "Comilão",
        GameMode.IceAge => "Era do Gelo",
        _ => mode.ToString()
    };

    public static string Description(GameMode mode) => mode switch
    {
        GameMode.Classic => "3 vidas para cada um. O último de pé vence a rodada. Quando o tempo acaba, a arena começa a fechar.",
        GameMode.BattleRoyale => "Uma vida só e a arena encolhendo em espiral. Sobreviva até o fim!",
        GameMode.StarCollector => "Estrelas caem na arena. Quem é atingido derruba metade delas. Junte 10 para vencer.",
        GameMode.CoinRush => "Moedas por toda parte e monstros famintos. Quem comer mais moedas vence.",
        GameMode.IceAge => "As bombas congelam. Exploda ou esbarre num rival congelado para quebrá-lo. E o chão escorrega!",
        _ => string.Empty
    };

    public static string Icon(GameMode mode) => mode switch
    {
        GameMode.Classic => "💣",
        GameMode.BattleRoyale => "👑",
        GameMode.StarCollector => "⭐",
        GameMode.CoinRush => "🪙",
        GameMode.IceAge => "❄️",
        _ => "?"
    };

    public static string DifficultyName(Difficulty difficulty) => difficulty switch
    {
        Difficulty.Easy => "Fácil",
        Difficulty.Normal => "Normal",
        Difficulty.Hard => "Difícil",
        _ => difficulty.ToString()
    };
}
