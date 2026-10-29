using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Xplodit.Client.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.Services.AddSingleton<GameSetupState>();
builder.Services.AddScoped<ProfileService>();

await builder.Build().RunAsync();
