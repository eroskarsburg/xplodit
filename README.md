# Xplodit

Jogo de bombas em arena, no estilo dos clássicos do gênero, com visual cartunesco, feito em .NET 10 e Blazor WebAssembly.

![CI](https://github.com/eroskarsburg/xplodit/actions/workflows/ci.yml/badge.svg)
![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-yellow.svg)

## Sobre

Plante bombas, destrua blocos, pegue power-ups e seja o último de pé. Tudo roda no navegador e é desenhado em tempo real no canvas, sem imagens prontas.

### Funcionalidades

- **5 modos:**
  - **Clássico:** 3 vidas cada.
  - **Battle Royale:** 1 vida e a arena encolhendo.
  - **Caça-Estrelas:** vence quem juntar 10 estrelas primeiro.
  - **Comilão:** junte moedas fugindo de monstros.
  - **Era do Gelo:** as bombas congelam o rival.
- **Partidas:** 1 ou 2 jogadores no mesmo teclado, até 3 rivais da CPU (fácil, normal ou difícil), monstros, melhor de 1, 3 ou 5 rodadas e missões a cada partida.
- **8 arenas temáticas de 25×19:** Praia, Brinquedoteca, Floresta, Geleira, Vulcão, Doceria, Estação Lunar e Navio Pirata. O layout muda a cada rodada.
- **Power-ups:** bomba extra, fogo, chute, velocidade, escudo, vida, bomba perfurante, fantasma, maldição, luva (arremessar bombas) e detonador remoto.
- **Pintura e morte súbita:** suas explosões pintam o chão com a sua cor, o que vale pontos. A morte súbita fecha a arena em espiral e termina com uma chuva de bombas.
- **Loja:** 127 itens em 11 categorias (chapéus, cabelos, expressões, óculos, roupas, calças, calçados, costas, bombas, rastros e danças), com raridades. O progresso fica salvo no navegador.
- **Visual cartunesco:** abertura animada, balões de quadrinho nas explosões, K.O. animado e dança da vitória.

### Controles

| Ação | 1 jogador | Jogador 1 (dupla) | Jogador 2 (dupla) |
|---|---|---|---|
| Mover | Setas ou WASD | WASD | Setas |
| Bomba / arremessar (com luva) | Espaço ou Enter | Espaço | Enter |
| Detonar (com detonador) | Q ou Shift | Q | L |

Esc ou P pausa. M liga ou desliga o som.

## Pré-requisitos

- [.NET SDK 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- Um navegador moderno (Chrome, Edge, Firefox)

## Instalação e execução

```bash
git clone https://github.com/eroskarsburg/xplodit.git
cd xplodit
dotnet run --project src/Xplodit --launch-profile http
```

Depois, abra http://localhost:5069 no navegador.

## Testes

```bash
dotnet build Xplodit.slnx
dotnet test Xplodit.slnx
```

Os testes ficam em `tests/Xplodit.Game.Tests` (xUnit) e cobrem o motor: partidas completas simuladas em todos os modos, arenas e dificuldades, comportamento dos bots, Luva e Detonador, catálogo da loja e geração de mapas.

## Estrutura do projeto

```
src/
├── Xplodit/          # Host ASP.NET Core: App.razor, wwwroot (CSS e JS do canvas)
│   └── wwwroot/js/   # cartoon.js (desenhos), gameCanvas.js (loop/efeitos), intro.js (abertura)
├── Xplodit.Client/   # Páginas e componentes Blazor WebAssembly (menu, loja, partida)
└── Xplodit.Game/     # Motor do jogo em C# puro: sessão, mapas, bots, missões, cosméticos
tests/
└── Xplodit.Game.Tests/ # Testes xUnit do motor
```

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
