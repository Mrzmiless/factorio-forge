# Factorio Forge

Factorio Forge é um launcher desktop para o jogo *Factorio*, focado em instâncias totalmente isoladas. Cada instância possui os seus próprios mods, saves, configurações e versão do jogo, sem interferir com outras instâncias ou com a instalação original.

## Objetivos

- Gerir múltiplas instâncias de Factorio
- Isolamento total de mods e saves
- Suportar diferentes versões do jogo
- Evitar conflitos entre modpacks
- Simplificar a gestão para jogadores avançados

## Principais funcionalidades

- Deteção automática da instalação existente do Factorio
- Criação automática de uma instância *vanilla* na primeira execução
- Criação, edição e remoção de instâncias
- Mods e saves isolados por instância
- Seleção da versão do jogo por instância
- Arranque do jogo usando `--config-path`
- Interface gráfica simples e intuitiva

## Como funciona o isolamento

O Factorio permite definir uma pasta de configuração personalizada ao arrancar. O launcher usa esta funcionalidade para garantir isolamento total.

Exemplo de comando:

```
factorio --config-path instances/seablock
```

Cada instância funciona como se fosse uma instalação independente do jogo.

## Estrutura de pastas

```
factorio-nexus/
  instances/
    vanilla/
      mods/
      saves/
      config/
      instance.json
    seablock/
      mods/
      saves/
      config/
      instance.json
  versions/
    1.1.92/
    1.1.76/
  src/
    main/
    renderer/
    core/
```

## Tecnologias utilizadas

- Electron
- Node.js
- TypeScript
- HTML / CSS
- JSON para configuração

## Fluxo da aplicação

1. O launcher inicia
2. Verifica se é a primeira execução
3. Se for, cria a instância *vanilla*
4. O utilizador seleciona ou cria uma instância
5. O launcher prepara os paths e a versão
6. O Factorio é iniciado com a instância selecionada

## Estado do projeto

Projeto em desenvolvimento.  
Criado no contexto de uma prova de aptidão profissional (PAP).

## Nota

Este projecto não é afiliado nem suportado oficialmente pela Wube Software.

---

## Instruções de desenvolvimento

Para começar a desenvolver o launcher:

1. Instale dependências:

```bash
npm install
```

2. Compile o TypeScript e copie os ficheiros estáticos:

```bash
npm run build
```

> O `main` da aplicação aponta para `dist/main/index.js`, certifique‑se de que a compilação gera esse ficheiro.

(isto executa `copy-assets.js` automaticamente para copiar HTML, CSS e outros assets)

3. Execute a aplicação:

```bash
npm start
```

Durante o desenvolvimento convém usar `npm run dev` para manter o compilador em watch mode.

### Estrutura da interface

- Janela inicializa a **1280×720** com mínimo de 800×600; centralizada.
- **Cartões de instância**: cada instância aparece em bloco com cantos arredondados, sombra e botões grandes.
- Inputs e selects estilizados com padding e canto suave para um aspecto moderno.
- **Tema escuro limpo** usando fonte local `CustomFont` (coloque o `.ttf` em `src/renderer/fonts/`) e acentos laranja.
- **Barra de título custom** com ícones SVG para minimizar/maximizar/fechar e arrasto em toda a área.
- **Sidebar de navegação** com ícones para cada página e transições suaves.
- **Modais animados** para confirmações e prompts (fade-in e botões integrados).
- Configuração para caminho do Factorio, com detecção automática na inicialização.
- Gestão de versões com lista e botão para importar diretórios de versão.
- Instâncias têm ações: Iniciar, Renomear, Remover, Abrir pasta.
- Formulário para criação de novas instâncias.

### Configuração de execução do Factorio

O launcher guarda o caminho usado para iniciar o jogo, permite alterar pelo UI e armazena num `config.json` em `%APPDATA%/factorio-forge`.

Por omissão o executável é assumido como `"C:\\Program Files\\Factorio\\bin\\x64\\factorio.exe"` (Windows). A mesma lógica pode ser adaptada para macOS/Linux.

Ao iniciar uma instância, o comando executado é:

```
factorio --config-path=<pasta da instância>
```

O processo é criado em modo destacado para não bloquear a interface.

