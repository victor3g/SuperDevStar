using System.Globalization;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

namespace SuperDevStar.Core
{
    /// <summary>Utilitarios de desenho (retangulos, placeholders, cores).</summary>
    public static class Gfx
    {
        /// <summary>PNGs carregados via FromStream nao sao pre-multiplicados, por isso NonPremultiplied.</summary>
        public static void Begin(SpriteBatch sb, Matrix? transform = null)
        {
            sb.Begin(SpriteSortMode.Deferred, BlendState.NonPremultiplied, SamplerState.PointClamp,
                DepthStencilState.None, RasterizerState.CullNone, null, transform);
        }

        public static void Rect(SpriteBatch sb, Rectangle r, Color c) => sb.Draw(Assets.Pixel, r, c);

        public static void Rect(SpriteBatch sb, float x, float y, float w, float h, Color c) =>
            sb.Draw(Assets.Pixel, new Rectangle((int)MathF.Round(x), (int)MathF.Round(y), (int)MathF.Round(w), (int)MathF.Round(h)), c);

        public static void Outline(SpriteBatch sb, Rectangle r, Color c, int t = 1)
        {
            Rect(sb, new Rectangle(r.X, r.Y, r.Width, t), c);
            Rect(sb, new Rectangle(r.X, r.Bottom - t, r.Width, t), c);
            Rect(sb, new Rectangle(r.X, r.Y, t, r.Height), c);
            Rect(sb, new Rectangle(r.Right - t, r.Y, t, r.Height), c);
        }

        /// <summary>Desenho usado quando a imagem ainda nao existe.</summary>
        public static void Placeholder(SpriteBatch sb, Rectangle r, Color fill)
        {
            Rect(sb, r, fill);
            Outline(sb, r, Darken(fill, 0.55f));
        }

        public static Color Darken(Color c, float f) =>
            new Color((int)(c.R * f), (int)(c.G * f), (int)(c.B * f), (int)c.A);

        public static Color Multiply(Color a, Color b) =>
            new Color(a.R * b.R / 255, a.G * b.G / 255, a.B * b.B / 255, a.A * b.A / 255);

        public static Color WithAlpha(Color c, int alpha) => new Color((int)c.R, (int)c.G, (int)c.B, alpha);

        public static Color ParseHex(string hex, Color fallback)
        {
            if (string.IsNullOrWhiteSpace(hex)) return fallback;
            hex = hex.Trim().TrimStart('#');
            if (hex.Length != 6 && hex.Length != 8) return fallback;
            if (!uint.TryParse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out uint v)) return fallback;
            if (hex.Length == 6) return new Color((int)((v >> 16) & 0xFF), (int)((v >> 8) & 0xFF), (int)(v & 0xFF));
            return new Color((int)((v >> 24) & 0xFF), (int)((v >> 16) & 0xFF), (int)((v >> 8) & 0xFF), (int)(v & 0xFF));
        }
    }
}
