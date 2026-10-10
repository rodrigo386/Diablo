# Straw Hat Slash 🏴‍☠️

Hack 'n' slash isométrico estilo **Diablo** com personagens de **One Piece**, feito para o navegador
(HTML5 Canvas + JavaScript puro, sem dependências e sem build).

> Projeto de fã, sem fins lucrativos. One Piece © Eiichiro Oda / Shueisha / Toei Animation.

## Como jogar

Abra o `index.html` no navegador (dois cliques já funcionam). Se preferir um servidor local:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

### Controles

| Tecla | Ação |
|---|---|
| `W` `A` `S` `D` | Mover |
| Mouse | Mirar |
| Botão esquerdo | Ataque básico (gera energia) |
| Botão direito | Habilidade secundária |
| `Q` `E` `R` | Habilidades (`R` é a suprema) |
| `Espaço` | Esquiva (invulnerável por um instante) |
| `1` | Comer carne 🍖 (cura 50%) |
| `F` ou clique no nome | Pegar item |
| `I` / `C` | Inventário / Personagem |
| `Tab` | Mostrar/ocultar minimapa |
| `M` | Som |
| `Esc` | Pausa |

## Conteúdo

**Personagens jogáveis**

| | Básico | RMB | Q (nv. 2) | E (nv. 3) | R (nv. 4) |
|---|---|---|---|---|---|
| **Luffy** | Gomu Gomu no Pistol | Gatling | Rocket | Bazooka | Gear Second |
| **Zoro** | Santoryu: Corte | Oni Giri | Tatsumaki | 360 Pound Ho | Kyutoryu: Asura |
| **Sanji** | Collier Shoot | Anti-Manner Kick Course | Concassé | Party Table Kick Course | Diable Jambe |

**Arlong Park** é gerado de forma procedural a cada partida: salas ligadas por corredores, cercadas pelo mar.

- **Inimigos:** Marinheiros, Atiradores da Marinha, Homens-Peixe e Piratas Brutamontes
- **Campeões** (anel azul): versões mais fortes, com loot melhor
- **Oficiais únicos** (anel laranja): Hachi, Kuroobi e Chew
- **Chefe Arlong:** investida *Shark Nose*, giro com a Kiribachi e *Uchimizu* (jato de água). Abaixo de 50% de vida
  fica furioso e chama reforços. Ataques fortes são marcados em vermelho no chão.

**Loot estilo Diablo:** itens Comuns, Mágicos (azul), Raros (amarelo) e Lendários (laranja) com afixos
aleatórios, como Chapéu de Palha, Wado Ichimonji, Sandai Kitetsu, Sapatos do Baratie e Log Pose. São 4 espaços de
equipamento e uma bolsa com 24 espaços. Itens vendem por Berries (฿).

**Progressão:** nível máximo 30. Ao derrotar Arlong você pode começar a **próxima jornada**, com inimigos mais
fortes e itens de nível maior. O progresso de cada personagem é salvo no navegador (`localStorage`).

## Sprites

Por padrão, todos os gráficos são desenhados por código. Para trocar pelas suas próprias imagens, veja
[`assets/sprites/LEIA-ME.md`](assets/sprites/LEIA-ME.md).

## Estrutura

```
index.html          página, HUD e telas
css/style.css       visual da interface
js/core.js          utilidades, projeção isométrica, entrada, áudio sintetizado
js/map.js           geração procedural, campo de fluxo (IA), colisão
js/fx.js            partículas, textos, efeitos de golpes, marcações de ataque
js/draw.js          desenho dos personagens, cenário, loot e sprites opcionais
js/items.js         raridades, afixos, lendários
js/characters.js    Luffy, Zoro, Sanji e suas habilidades
js/combat.js        acertos, dano, mortes, drops, projéteis
js/player.js        jogador: atributos, movimento, habilidades, níveis
js/enemies.js       inimigos, IA e o chefe Arlong
js/ui.js            HUD, inventário, tooltips, minimapa, menus
js/game.js          estado, salvamento, criação da masmorra, loop e renderização
```
