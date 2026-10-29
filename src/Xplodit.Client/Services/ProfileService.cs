using System.Text.Json;
using Microsoft.JSInterop;
using Xplodit.Game.Characters;
using Xplodit.Game.Models;

namespace Xplodit.Client.Services;

public sealed class ProfileData
{
    public int Points { get; set; }
    public int Stars { get; set; }
    public int MatchesPlayed { get; set; }
    public int MatchesWon { get; set; }
    public int BestScore { get; set; }
    public List<string> Unlocked { get; set; } = [];
    public CharacterLoadout[]? Loadouts { get; set; }
}

/// <summary>Player progress (points, mission stars, unlocked costumes) kept in the browser's localStorage.</summary>
public sealed class ProfileService(IJSRuntime js, GameSetupState setup)
{
    private const string StorageKey = "xplodit.profile.v2";
    private const string LegacyStorageKey = "xplodit.profile.v1";
    private bool _loaded;

    public ProfileData Data { get; private set; } = new();

    public event Action? Changed;

    public async Task EnsureLoadedAsync()
    {
        if (_loaded)
        {
            return;
        }

        _loaded = true;
        try
        {
            var json = await js.InvokeAsync<string?>("localStorage.getItem", StorageKey);
            if (!string.IsNullOrWhiteSpace(json))
            {
                Data = JsonSerializer.Deserialize<ProfileData>(json) ?? new ProfileData();
            }
            else
            {
                await MigrateLegacyAsync();
            }
        }
        catch (JsonException)
        {
            Data = new ProfileData();
        }
        catch (JSException)
        {
            // Storage blocked (private mode); progress just won't persist.
        }

        if (Data.Loadouts is { Length: 2 })
        {
            foreach (var loadout in Data.Loadouts)
            {
                loadout.Sanitize();
            }

            setup.Loadouts = Data.Loadouts;
        }

        Changed?.Invoke();
    }

    /// <summary>The old save had different costumes; keep the earned points and stats, drop the outfits.</summary>
    private async Task MigrateLegacyAsync()
    {
        var legacy = await js.InvokeAsync<string?>("localStorage.getItem", LegacyStorageKey);
        if (string.IsNullOrWhiteSpace(legacy))
        {
            return;
        }

        using var doc = JsonDocument.Parse(legacy);
        var root = doc.RootElement;
        int Read(string name) => root.TryGetProperty(name, out var v) && v.TryGetInt32(out var n) ? n : 0;
        Data = new ProfileData
        {
            Points = Read(nameof(ProfileData.Points)),
            Stars = Read(nameof(ProfileData.Stars)),
            MatchesPlayed = Read(nameof(ProfileData.MatchesPlayed)),
            MatchesWon = Read(nameof(ProfileData.MatchesWon)),
            BestScore = Read(nameof(ProfileData.BestScore))
        };
        await SaveAsync();
    }

    public bool IsUnlocked(CosmeticItem item) => item.IsFree || Data.Unlocked.Contains(item.Key);

    public int UnlockedCount => CosmeticCatalog.All.Count(IsUnlocked);

    public async Task<bool> TryBuyAsync(CosmeticItem item)
    {
        if (IsUnlocked(item) || Data.Points < item.Price)
        {
            return false;
        }

        Data.Points -= item.Price;
        Data.Unlocked.Add(item.Key);
        await SaveAsync();
        return true;
    }

    public async Task RecordMatchAsync(int pointsEarned, int starsEarned, bool won, int bestScore)
    {
        Data.Points += pointsEarned;
        Data.Stars += starsEarned;
        Data.MatchesPlayed++;
        if (won)
        {
            Data.MatchesWon++;
        }

        Data.BestScore = Math.Max(Data.BestScore, bestScore);
        await SaveAsync();
    }

    public async Task SaveAsync()
    {
        Data.Loadouts = setup.Loadouts;
        try
        {
            await js.InvokeVoidAsync("localStorage.setItem", StorageKey, JsonSerializer.Serialize(Data));
        }
        catch (JSException)
        {
        }

        Changed?.Invoke();
    }
}
