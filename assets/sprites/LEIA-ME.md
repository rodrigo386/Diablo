# Sprites personalizados

Por padrão, todos os personagens são desenhados por código. Para usar suas próprias imagens:

1. Coloque um PNG com fundo transparente nesta pasta, com o personagem **olhando para a direita**
   e os pés na base da imagem. Ex.: `luffy.png`.
2. Adicione o nome em `sprites.js`: `window.CUSTOM_SPRITES = ['luffy'];`
3. Recarregue o jogo. O sprite é espelhado automaticamente quando o personagem vira para a esquerda.

Nomes aceitos: `luffy`, `zoro`, `sanji`, `marine`, `rifle`, `fishman`, `brute`, `arlong`, `hachi`, `kuroobi`, `chew`.

> Atenção: sprites oficiais de One Piece têm direitos autorais (Toei / Bandai Namco / Shueisha).
> Use-os apenas localmente, para uso pessoal, e não os publique neste repositório.
> Para publicar, prefira arte própria ou com licença livre (ex.: CC0).
