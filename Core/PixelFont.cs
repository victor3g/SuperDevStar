using System.Globalization;
using System.Text;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

namespace SuperDevStar.Core
{
    /// <summary>
    /// Fonte pixelada 5x7 embutida no codigo (nao precisa de arquivo de fonte).
    /// Acentos sao removidos automaticamente ("Missão" vira "MISSAO").
    /// </summary>
    public static class PixelFont
    {
        public const int GlyphWidth = 5;
        public const int GlyphHeight = 7;
        public const int Advance = 6;
        public const int LineHeight = 10;

        static readonly Dictionary<char, byte[]> Glyphs = new()
        {
            ['0'] = new byte[] { 0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E },
            ['1'] = new byte[] { 0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E },
            ['2'] = new byte[] { 0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F },
            ['3'] = new byte[] { 0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E },
            ['4'] = new byte[] { 0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02 },
            ['5'] = new byte[] { 0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E },
            ['6'] = new byte[] { 0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E },
            ['7'] = new byte[] { 0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08 },
            ['8'] = new byte[] { 0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E },
            ['9'] = new byte[] { 0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C },
            ['A'] = new byte[] { 0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11 },
            ['B'] = new byte[] { 0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E },
            ['C'] = new byte[] { 0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E },
            ['D'] = new byte[] { 0x1C, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1C },
            ['E'] = new byte[] { 0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F },
            ['F'] = new byte[] { 0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10 },
            ['G'] = new byte[] { 0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F },
            ['H'] = new byte[] { 0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11 },
            ['I'] = new byte[] { 0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E },
            ['J'] = new byte[] { 0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C },
            ['K'] = new byte[] { 0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11 },
            ['L'] = new byte[] { 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F },
            ['M'] = new byte[] { 0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11 },
            ['N'] = new byte[] { 0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11 },
            ['O'] = new byte[] { 0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E },
            ['P'] = new byte[] { 0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10 },
            ['Q'] = new byte[] { 0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D },
            ['R'] = new byte[] { 0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11 },
            ['S'] = new byte[] { 0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E },
            ['T'] = new byte[] { 0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04 },
            ['U'] = new byte[] { 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E },
            ['V'] = new byte[] { 0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04 },
            ['W'] = new byte[] { 0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A },
            ['X'] = new byte[] { 0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11 },
            ['Y'] = new byte[] { 0x11, 0x11, 0x11, 0x0A, 0x04, 0x04, 0x04 },
            ['Z'] = new byte[] { 0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F },
            ['-'] = new byte[] { 0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00 },
            ['.'] = new byte[] { 0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C },
            [','] = new byte[] { 0x00, 0x00, 0x00, 0x00, 0x0C, 0x04, 0x08 },
            ['!'] = new byte[] { 0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04 },
            ['?'] = new byte[] { 0x0E, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04 },
            [':'] = new byte[] { 0x00, 0x0C, 0x0C, 0x00, 0x0C, 0x0C, 0x00 },
            [';'] = new byte[] { 0x00, 0x0C, 0x0C, 0x00, 0x0C, 0x04, 0x08 },
            ['/'] = new byte[] { 0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10 },
            ['*'] = new byte[] { 0x00, 0x04, 0x15, 0x0E, 0x15, 0x04, 0x00 },
            ['×'] = new byte[] { 0x00, 0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11 },
            ['('] = new byte[] { 0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02 },
            [')'] = new byte[] { 0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08 },
            ['<'] = new byte[] { 0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02 },
            ['>'] = new byte[] { 0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08 },
            ['{'] = new byte[] { 0x06, 0x04, 0x04, 0x08, 0x04, 0x04, 0x06 },
            ['}'] = new byte[] { 0x0C, 0x04, 0x04, 0x02, 0x04, 0x04, 0x0C },
            ['['] = new byte[] { 0x0E, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0E },
            [']'] = new byte[] { 0x0E, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0E },
            ['_'] = new byte[] { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F },
            ['='] = new byte[] { 0x00, 0x00, 0x1F, 0x00, 0x1F, 0x00, 0x00 },
            ['+'] = new byte[] { 0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00 },
            ['#'] = new byte[] { 0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A },
            ['@'] = new byte[] { 0x0E, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0E },
            ['%'] = new byte[] { 0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03 },
            ['\''] = new byte[] { 0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00 },
            ['"'] = new byte[] { 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00 },
            ['©'] = new byte[] { 0x0E, 0x11, 0x17, 0x19, 0x17, 0x11, 0x0E },
        };

        public static string Normalize(string text)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            string decomposed = text.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(decomposed.Length);
            foreach (char ch in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
                sb.Append(char.ToUpperInvariant(ch));
            }
            return sb.ToString();
        }

        public static void Draw(SpriteBatch sb, string text, float x, float y, Color color, int scale = 1, bool shadow = false)
        {
            text = Normalize(text);
            if (shadow) DrawRaw(sb, text, x + scale, y + scale, Color.Black, scale);
            DrawRaw(sb, text, x, y, color, scale);
        }

        public static void DrawCentered(SpriteBatch sb, string text, float centerX, float y, Color color, int scale = 1, bool shadow = false)
        {
            Draw(sb, text, centerX - Measure(text, scale) / 2f, y, color, scale, shadow);
        }

        public static void DrawRight(SpriteBatch sb, string text, float rightX, float y, Color color, int scale = 1, bool shadow = false)
        {
            Draw(sb, text, rightX - Measure(text, scale), y, color, scale, shadow);
        }

        static void DrawRaw(SpriteBatch sb, string text, float x, float y, Color color, int scale)
        {
            int startX = (int)MathF.Round(x);
            int cx = startX;
            int cy = (int)MathF.Round(y);
            foreach (char ch in text)
            {
                if (ch == '\n')
                {
                    cx = startX;
                    cy += LineHeight * scale;
                    continue;
                }
                if (Glyphs.TryGetValue(ch, out var rows))
                {
                    for (int r = 0; r < GlyphHeight; r++)
                    {
                        byte bits = rows[r];
                        if (bits == 0) continue;
                        for (int c = 0; c < GlyphWidth; c++)
                        {
                            if ((bits & (1 << (GlyphWidth - 1 - c))) != 0)
                                sb.Draw(Assets.Pixel, new Rectangle(cx + c * scale, cy + r * scale, scale, scale), color);
                        }
                    }
                }
                cx += Advance * scale;
            }
        }

        public static int Measure(string text, int scale = 1)
        {
            text = Normalize(text);
            int longest = 0;
            foreach (var line in text.Split('\n')) longest = Math.Max(longest, line.Length);
            return longest == 0 ? 0 : (longest * Advance - 1) * scale;
        }

        /// <summary>Quebra o texto em linhas que cabem em maxWidth pixels.</summary>
        public static List<string> Wrap(string text, int maxWidth, int scale = 1)
        {
            var lines = new List<string>();
            if (string.IsNullOrWhiteSpace(text)) return lines;
            int maxChars = Math.Max(1, (maxWidth / scale + 1) / Advance);
            foreach (var paragraph in text.Split('\n'))
            {
                var current = new StringBuilder();
                foreach (var word in paragraph.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                {
                    if (current.Length > 0 && current.Length + 1 + word.Length > maxChars)
                    {
                        lines.Add(current.ToString());
                        current.Clear();
                    }
                    if (current.Length > 0) current.Append(' ');
                    current.Append(word);
                }
                lines.Add(current.ToString());
            }
            return lines;
        }
    }
}
