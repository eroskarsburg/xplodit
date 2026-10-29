namespace Xplodit.Game.Models;

/// <summary>One-shot event emitted during a tick; the renderer turns it into sound and floating text.</summary>
public readonly record struct GameEvent(string Kind, float X, float Y, string? Text = null, string? Color = null);
