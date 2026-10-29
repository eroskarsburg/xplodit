using Xplodit.Game.Characters;
using Xplodit.Game.Maps;
using Xplodit.Game.Models;

namespace Xplodit.Client.Services;

public sealed class GameSetupState
{
    public MatchSettings Settings { get; set; } = new();
    public CharacterLoadout[] Loadouts { get; set; } = [CharacterCatalog.CreateDefault(0), CharacterCatalog.CreateDefault(1)];
    public string? SelectedMapId { get; set; }

    public CharacterLoadout Loadout => Loadouts[0];

    public MapDefinition? SelectedMap =>
        SelectedMapId is null ? null : MapCatalog.GetById(SelectedMapId);

    public bool IsReady => SelectedMap is not null;

    public void ResetMatchSelection()
    {
        SelectedMapId = null;
    }
}
