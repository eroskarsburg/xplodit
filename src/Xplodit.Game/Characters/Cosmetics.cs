namespace Xplodit.Game.Characters;

public enum CosmeticSlot : byte
{
    Hat,
    Hair,
    Face,
    Eyewear,
    Top,
    Bottom,
    Shoes,
    Back,
    BombSkin,
    Trail,
    Dance
}

public enum Rarity : byte
{
    Comum,
    Raro,
    Epico,
    Lendario
}

public sealed record CosmeticItem(string Id, CosmeticSlot Slot, string Name, int Price)
{
    public Rarity Rarity => Price switch
    {
        <= 150 => Rarity.Comum,
        <= 350 => Rarity.Raro,
        <= 700 => Rarity.Epico,
        _ => Rarity.Lendario
    };

    /// <summary>Unlock key stored in the profile.</summary>
    public string Key => $"{Slot}:{Id}".ToLowerInvariant();

    public bool IsFree => Price == 0;
}

/// <summary>Every item sold in the shop. Ids are what the canvas renderer draws.</summary>
public static class CosmeticCatalog
{
    public static IReadOnlyList<CosmeticItem> All { get; } = Build();

    public static IReadOnlyList<CosmeticSlot> Slots { get; } = Enum.GetValues<CosmeticSlot>();

    public static IEnumerable<CosmeticItem> InSlot(CosmeticSlot slot) => All.Where(i => i.Slot == slot);

    public static CosmeticItem? Find(CosmeticSlot slot, string? id) =>
        All.FirstOrDefault(i => i.Slot == slot && i.Id == id);

    public static string SlotName(CosmeticSlot slot) => slot switch
    {
        CosmeticSlot.Hat => "Chapéus",
        CosmeticSlot.Hair => "Cabelos",
        CosmeticSlot.Face => "Expressões",
        CosmeticSlot.Eyewear => "Rosto & Óculos",
        CosmeticSlot.Top => "Roupas",
        CosmeticSlot.Bottom => "Calças",
        CosmeticSlot.Shoes => "Calçados",
        CosmeticSlot.Back => "Costas",
        CosmeticSlot.BombSkin => "Bombas",
        CosmeticSlot.Trail => "Rastros",
        CosmeticSlot.Dance => "Danças",
        _ => slot.ToString()
    };

    public static string SlotIcon(CosmeticSlot slot) => slot switch
    {
        CosmeticSlot.Hat => "🎩",
        CosmeticSlot.Hair => "💇",
        CosmeticSlot.Face => "😄",
        CosmeticSlot.Eyewear => "🕶️",
        CosmeticSlot.Top => "👕",
        CosmeticSlot.Bottom => "👖",
        CosmeticSlot.Shoes => "👟",
        CosmeticSlot.Back => "🎒",
        CosmeticSlot.BombSkin => "💣",
        CosmeticSlot.Trail => "✨",
        CosmeticSlot.Dance => "🕺",
        _ => "•"
    };

    public static string RarityName(Rarity rarity) => rarity switch
    {
        Rarity.Raro => "Raro",
        Rarity.Epico => "Épico",
        Rarity.Lendario => "Lendário",
        _ => "Comum"
    };

    private static List<CosmeticItem> Build()
    {
        var list = new List<CosmeticItem>();
        void Add(CosmeticSlot slot, params (string Id, string Name, int Price)[] items) =>
            list.AddRange(items.Select(i => new CosmeticItem(i.Id, slot, i.Name, i.Price)));

        Add(CosmeticSlot.Hat,
            ("none", "Nenhum", 0), ("cap", "Boné", 0), ("beanie", "Gorro", 80), ("party", "Chapéu de festa", 100),
            ("helmet", "Capacete", 120), ("chef", "Chef", 150), ("propeller", "Hélice", 200), ("cowboy", "Caubói", 220),
            ("bunny", "Orelhas de coelho", 250), ("cat", "Orelhas de gato", 250), ("pirate", "Pirata", 260),
            ("sombrero", "Sombreiro", 280), ("viking", "Viking", 300), ("mushroom", "Cogumelo", 320),
            ("pumpkin", "Abóbora", 350), ("tophat", "Cartola", 400), ("wizard", "Mago", 450),
            ("astronaut", "Astronauta", 600), ("dino", "Dinossauro", 700), ("crown", "Coroa", 900),
            ("halo", "Auréola", 1000), ("bombhat", "Bomba na cabeça", 1200));

        Add(CosmeticSlot.Hair,
            ("none", "Careca", 0), ("short", "Curtinho", 0), ("spiky", "Espetado", 80), ("ponytail", "Rabo de cavalo", 120),
            ("pigtails", "Maria-chiquinha", 140), ("mohawk", "Moicano", 150), ("afro", "Black power", 150),
            ("bun", "Coque", 160), ("long", "Longo", 180), ("quiff", "Topete", 200), ("emo", "Franja emo", 220),
            ("flame", "Cabelo de fogo", 900));

        Add(CosmeticSlot.Face,
            ("happy", "Feliz", 0), ("angry", "Bravo", 0), ("cheeky", "Sapeca", 100), ("surprised", "Surpreso", 100),
            ("sleepy", "Sonolento", 120), ("cat", "Gatinho", 250), ("love", "Apaixonado", 300),
            ("vampire", "Vampiro", 350), ("crazy", "Maluquinho", 400), ("robot", "Robô", 600));

        Add(CosmeticSlot.Eyewear,
            ("none", "Nada", 0), ("nerd", "Óculos nerd", 120), ("sunglasses", "Óculos escuros", 150),
            ("mustache", "Bigodão", 150), ("clown", "Nariz de palhaço", 180), ("eyepatch", "Tapa-olho", 200),
            ("beard", "Barba", 220), ("monocle", "Monóculo", 250), ("3d", "Óculos 3D", 280),
            ("ninja", "Máscara ninja", 300), ("hero", "Máscara de herói", 350), ("visor", "Visor cibernético", 450));

        Add(CosmeticSlot.Top,
            ("tee", "Camiseta", 0), ("stripes", "Listrada", 0), ("vest", "Colete", 100), ("hoodie", "Moletom", 150),
            ("overalls", "Jardineira", 180), ("hawaii", "Havaiana", 200), ("jersey", "Camisa de futebol", 220),
            ("jacket", "Jaqueta de couro", 300), ("cape", "Capa", 350), ("kimono", "Kimono", 400),
            ("tuxedo", "Smoking", 450), ("skeleton", "Esqueleto", 500), ("armor", "Armadura", 600),
            ("superhero", "Super-herói", 650), ("space", "Traje espacial", 700), ("king", "Manto real", 1100));

        Add(CosmeticSlot.Bottom,
            ("pants", "Calça", 0), ("shorts", "Bermuda", 0), ("skirt", "Saia", 100), ("jeans", "Jeans rasgado", 120),
            ("cargo", "Cargo", 150), ("kilt", "Kilt xadrez", 250), ("stars", "Calça estrelada", 400),
            ("robot", "Pernas de robô", 600));

        Add(CosmeticSlot.Shoes,
            ("sneakers", "Tênis", 0), ("sandals", "Chinelos", 80), ("boots", "Botas", 100), ("rain", "Galochas", 120),
            ("hightops", "Cano alto", 180), ("bunny", "Pantufas de coelho", 250), ("flippers", "Pés de pato", 300),
            ("skates", "Patins", 400), ("rockets", "Botas-foguete", 900), ("gold", "Tênis de ouro", 1100));

        Add(CosmeticSlot.Back,
            ("none", "Nada", 0), ("backpack", "Mochila", 100), ("balloon", "Balão", 250), ("turtle", "Casco de tartaruga", 300),
            ("guitar", "Guitarra", 350), ("sword", "Espada", 400), ("butterfly", "Asas de borboleta", 450),
            ("bat", "Asas de morcego", 500), ("angel", "Asas de anjo", 600), ("tail", "Cauda de dragão", 650),
            ("jetpack", "Jetpack", 700), ("bombpack", "Mochila de bombas", 900));

        Add(CosmeticSlot.BombSkin,
            ("classic", "Clássica", 0), ("watermelon", "Melancia", 200), ("soccer", "Bola de futebol", 200),
            ("pumpkin", "Abóbora", 300), ("snowball", "Bola de neve", 300), ("donut", "Rosquinha", 350),
            ("skull", "Caveira", 450), ("disco", "Globo de discoteca", 600), ("planet", "Planeta", 700),
            ("gem", "Joia", 1200));

        Add(CosmeticSlot.Trail,
            ("none", "Nada", 0), ("dust", "Poeirinha", 80), ("footprints", "Pegadas", 150), ("bubbles", "Bolhas", 250),
            ("stars", "Estrelinhas", 300), ("hearts", "Corações", 300), ("notes", "Notas musicais", 350),
            ("fire", "Fogo", 600), ("rainbow", "Arco-íris", 1000));

        Add(CosmeticSlot.Dance,
            ("wave", "Tchauzinho", 0), ("spin", "Piãozinho", 200), ("flex", "Muque", 250), ("robot", "Robô", 400),
            ("floss", "Dancinha", 500), ("backflip", "Mortal", 900));

        return list;
    }
}
