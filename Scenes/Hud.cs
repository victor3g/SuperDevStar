using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.Scenes
{
    /// <summary>Barra superior: NOME/pontos, moedas, mundo e tempo (layout do SMB).</summary>
    public static class Hud
    {
        static readonly int[] CoinFrames = { 0, 0, 0, 1, 2, 1 };

        public static void Draw(SpriteBatch sb, GameSession session, string world, int? time, int frame)
        {
            Gfx.Begin(sb);

            string name = session?.Character?.Name ?? "DEV";
            if (name.Length > 8) name = name.Substring(0, 8);
            PixelFont.Draw(sb, name, 16, 8, Color.White, 1, shadow: true);
            PixelFont.Draw(sb, (session?.Score ?? 0).ToString("D6"), 16, 18, Color.White, 1, shadow: true);

            var coin = Sprites.Get("UI/hud_coin.png", 8, 8, new Color(252, 200, 40));
            coin.Draw(sb, CoinFrames[(frame / 8) % CoinFrames.Length], new Vector2(86, 18));
            PixelFont.Draw(sb, "×" + (session?.Coins ?? 0).ToString("D2"), 96, 18, Color.White, 1, shadow: true);

            PixelFont.Draw(sb, "WORLD", 144, 8, Color.White, 1, shadow: true);
            PixelFont.DrawCentered(sb, world, 158, 18, Color.White, 1, shadow: true);

            PixelFont.Draw(sb, "TIME", 204, 8, Color.White, 1, shadow: true);
            if (time.HasValue) PixelFont.Draw(sb, time.Value.ToString("D3"), 207, 18, Color.White, 1, shadow: true);

            sb.End();
        }
    }
}
