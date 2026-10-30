using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

namespace SuperDevStar.Core
{
    /// <summary>
    /// Folha de sprites com frames de tamanho fixo, organizados da esquerda para a direita
    /// (e quebrando linha se a imagem tiver mais de uma linha).
    /// Se a imagem nao existir, desenha um retangulo colorido do tamanho do frame.
    /// </summary>
    public sealed class SpriteSheet
    {
        readonly int _cols;

        public Texture2D Texture { get; }
        public int FrameWidth { get; }
        public int FrameHeight { get; }
        public int FrameCount { get; }
        public Color Fallback { get; set; }
        /// <summary>Desenha um "olho" no placeholder para mostrar para onde o sprite esta virado.</summary>
        public bool PlaceholderEye { get; set; }
        public bool IsPlaceholder => Texture == null;

        public SpriteSheet(string path, int frameWidth, int frameHeight, Color fallback)
            : this(Assets.Texture(path), frameWidth, frameHeight, fallback) { }

        public SpriteSheet(Texture2D texture, int frameWidth, int frameHeight, Color fallback)
        {
            Texture = texture;
            FrameWidth = frameWidth;
            FrameHeight = frameHeight;
            Fallback = fallback;
            if (texture != null)
            {
                _cols = Math.Max(1, texture.Width / frameWidth);
                int rows = Math.Max(1, texture.Height / frameHeight);
                FrameCount = _cols * rows;
            }
            else
            {
                _cols = 1;
                FrameCount = 1;
            }
        }

        public void Draw(SpriteBatch sb, int frame, Vector2 topLeft, bool flipX = false, Color? tint = null,
            bool flipY = false, int placeholderHeight = 0, float scale = 1f)
        {
            Color color = tint ?? Color.White;
            int x = (int)MathF.Round(topLeft.X);
            int y = (int)MathF.Round(topLeft.Y);

            if (Texture == null)
            {
                int h = placeholderHeight > 0 ? placeholderHeight : FrameHeight;
                var r = new Rectangle(x, y + (int)((FrameHeight - h) * scale), (int)(FrameWidth * scale), (int)(h * scale));
                Gfx.Placeholder(sb, r, Gfx.Multiply(Fallback, color));
                if (PlaceholderEye)
                {
                    int s = Math.Max(1, (int)scale);
                    int ex = flipX ? r.X + 3 * s : r.Right - 5 * s;
                    int ey = flipY ? r.Bottom - 6 * s : r.Y + 3 * s;
                    Gfx.Rect(sb, new Rectangle(ex, ey, 2 * s, 3 * s), Color.White);
                }
                return;
            }

            frame = ((frame % FrameCount) + FrameCount) % FrameCount;
            var src = new Rectangle((frame % _cols) * FrameWidth, (frame / _cols) * FrameHeight, FrameWidth, FrameHeight);
            var fx = SpriteEffects.None;
            if (flipX) fx |= SpriteEffects.FlipHorizontally;
            if (flipY) fx |= SpriteEffects.FlipVertically;
            sb.Draw(Texture, new Vector2(x, y), src, color, 0f, Vector2.Zero, scale, fx, 0f);
        }
    }

    /// <summary>Cache de SpriteSheets compartilhadas.</summary>
    public static class Sprites
    {
        static readonly Dictionary<string, SpriteSheet> Cache = new(StringComparer.OrdinalIgnoreCase);

        public static SpriteSheet Get(string path, int frameWidth, int frameHeight, Color fallback)
        {
            string key = $"{path}|{frameWidth}x{frameHeight}|{fallback.PackedValue}";
            if (!Cache.TryGetValue(key, out var sheet))
            {
                sheet = new SpriteSheet(path, frameWidth, frameHeight, fallback);
                Cache[key] = sheet;
            }
            return sheet;
        }

        /// <summary>
        /// Procura "pasta/nome_tema.png" (ex: Enemies/bug_underground.png) e cai para "pasta/nome.png".
        /// </summary>
        public static SpriteSheet Themed(string folder, string name, string theme, int frameWidth, int frameHeight, Color fallback)
        {
            string themed = $"{folder}/{name}_{theme}.png";
            if (!string.Equals(theme, "overworld", StringComparison.OrdinalIgnoreCase) && Assets.Exists(themed))
                return Get(themed, frameWidth, frameHeight, fallback);
            return Get($"{folder}/{name}.png", frameWidth, frameHeight, fallback);
        }
    }
}
