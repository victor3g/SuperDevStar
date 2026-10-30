using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.World
{
    /// <summary>
    /// Imagens dos tiles de um tema. Procura Assets/Tiles/{tema}/{nome}.png e, se nao existir,
    /// usa Assets/Tiles/overworld/{nome}.png. Sem nenhuma das duas, desenha placeholder.
    /// </summary>
    public sealed class TileSet
    {
        readonly Dictionary<TileType, SpriteSheet> _sheets = new();

        public string Theme { get; }

        public TileSet(string theme)
        {
            Theme = string.IsNullOrWhiteSpace(theme) ? "overworld" : theme;
            bool dark = Theme == "underground";

            var pipe = new Color(0, 168, 68);
            var pipeDark = new Color(0, 120, 48);

            Add(TileType.Ground, "ground", dark ? new Color(40, 96, 168) : new Color(46, 139, 87));
            Add(TileType.Brick, "brick", dark ? new Color(72, 120, 200) : new Color(200, 76, 12));
            Add(TileType.Question, "question", new Color(248, 184, 0));
            Add(TileType.Used, "used", new Color(136, 88, 56));
            Add(TileType.Hard, "hard", dark ? new Color(90, 110, 150) : new Color(124, 124, 140));
            Add(TileType.PipeTopLeft, "pipe_top_left", pipe);
            Add(TileType.PipeTopRight, "pipe_top_right", pipe);
            Add(TileType.PipeLeft, "pipe_left", pipeDark);
            Add(TileType.PipeRight, "pipe_right", pipeDark);
            Add(TileType.HPipeMouthTop, "hpipe_mouth_top", pipe);
            Add(TileType.HPipeMouthBottom, "hpipe_mouth_bottom", pipe);
            Add(TileType.HPipeBodyTop, "hpipe_body_top", pipeDark);
            Add(TileType.HPipeBodyBottom, "hpipe_body_bottom", pipeDark);
        }

        void Add(TileType type, string name, Color fallback)
        {
            string themed = $"Tiles/{Theme}/{name}.png";
            string path = Theme == "overworld" || Assets.Exists(themed) ? themed : $"Tiles/overworld/{name}.png";
            _sheets[type] = Sprites.Get(path, 16, 16, fallback);
        }

        public void Draw(SpriteBatch sb, TileType type, Vector2 position, int frame)
        {
            if (_sheets.TryGetValue(type, out var sheet))
            {
                sheet.Draw(sb, frame, position);
                if (sheet.IsPlaceholder && type == TileType.Question)
                    PixelFont.Draw(sb, "?", position.X + 5, position.Y + 4, Color.White);
            }
        }
    }
}
