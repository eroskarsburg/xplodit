# Contribuindo com o Xplodit

Obrigado pelo interesse em contribuir! Este guia explica como preparar o ambiente e enviar mudanças.

## Ambiente

1. Instale o [.NET SDK 10](https://dotnet.microsoft.com/download/dotnet/10.0).
2. Clone e rode o projeto:

   ```bash
   git clone https://github.com/eroskarsburg/xplodit.git
   cd xplodit
   dotnet run --project src/Xplodit --launch-profile http
   ```

3. Abra http://localhost:5069.

## Fluxo de branches

- A branch principal é `main`.
- Crie sua branch a partir de `main`:
  - `feature/<descricao-curta>` para novidades.
  - `fix/<descricao-curta>` para correções.
- Abra um Pull Request para `main`. Não envie commits direto para `main`.

## Padrão de commits

Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

- `feat:` nova funcionalidade (ex.: `feat: adiciona modo captura da bandeira`)
- `fix:` correção de bug
- `docs:` documentação
- `refactor:` refatoração sem mudar comportamento
- `test:` testes
- `chore:` manutenção (dependências, build, CI)

## Build e testes locais

Antes de abrir o PR, rode:

```bash
dotnet build Xplodit.slnx --configuration Release
dotnet test Xplodit.slnx --configuration Release
```

Ao mexer no motor (`src/Xplodit.Game`), jogue algumas partidas em modos diferentes para conferir o comportamento dos bots e o fim das rodadas.

## Integração contínua

Todo PR para `main` roda o workflow de CI (build e testes). **O CI precisa passar antes do merge.**

## Checklist do Pull Request

- [ ] Descrição clara do que mudou e por quê (com prints/GIFs para mudanças visuais).
- [ ] Testes adicionados ou atualizados quando aplicável.
- [ ] Documentação (README/CONTRIBUTING) atualizada se necessário.
- [ ] Build e testes passando localmente e no CI.

## Bugs e sugestões

Abra uma [issue](https://github.com/eroskarsburg/xplodit/issues) com:

- **Bug:** passos para reproduzir, comportamento esperado e obtido, navegador e sistema operacional, e prints, se houver.
- **Sugestão:** a ideia, o motivo e, se possível, um exemplo de como funcionaria no jogo.
