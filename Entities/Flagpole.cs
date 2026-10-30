using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.Entities
{
    /// <summary>
    /// Mastro do fim da fase ("antena de deploy"). No mapa, 'F' marca o TOPO; o mastro desce
    /// ate o primeiro bloco solido abaixo (normalmente um 'X').
    /// </summary>
    public sealed class Flagpole : Entity
    {
        readonly SpriteSheet _pole = Sprites.Get("Objects/flagpole.png", 16, 16, new Color(80, 200, 80));
        readonly SpriteSheet _top = Sprites.Get("Objects/flagpole_top.png", 16, 16, new Color(80, 220, 120));
        readonly SpriteSheet _flag = Sprites.Get("Objects/flag.png", 16, 16, Color.White);

        public float PoleX { get; }
        public float TopY { get; }
        public float BottomY { get; }
        public float FlagY { get; private set; }
        public bool Lowering { get; set; }
        public bool FlagDown { get; private set; }

        public Flagpole(int tileX, int topTileY, int bottomTileY)
        {
            PoleX = tileX * 16 + 8;
            TopY = topTileY * 16;
            BottomY = bottomTileY * 16;
            FlagY = TopY + 16;
            Position = new Vector2(PoleX - 1, TopY);
            Width = 2f;
            Height = BottomY - TopY;
        }

        public bool Touches(Player p) =>
            p.Right >= PoleX - 1f && p.Left <= PoleX + 1f && p.Bottom > TopY && p.Top < BottomY;

        /// <summary>Quanto mais alto agarrar, mais pontos (como no SMB).</summary>
        public int ScoreFor(Player p)
        {
            float f = (BottomY - p.Bottom) / Math.Max(1f, BottomY - TopY);
            if (f >= 0.9f) return 5000;
            if (f >= 0.6f) return 2000;
            if (f >= 0.4f) return 800;
            if (f >= 0.15f) return 400;
            return 100;
        }

        public override void Update()
        {
            if (!Lowering || FlagDown) return;
            FlagY += 2f;
            if (FlagY >= BottomY - 32f)
            {
                FlagY = BottomY - 32f;
                FlagDown = true;
            }
        }

        public override void Draw(SpriteBatch sb)
        {
            for (float y = TopY + 16; y < BottomY; y += 16)
            {
                if (_pole.IsPlaceholder) Gfx.Rect(sb, PoleX - 1, y, 2, 16, _pole.Fallback);
                else _pole.Draw(sb, 0, new Vector2(PoleX - 8, y));
            }

            if (_top.IsPlaceholder) Gfx.Placeholder(sb, new Rectangle((int)PoleX - 4, (int)TopY + 8, 8, 8), _top.Fallback);
            else _top.Draw(sb, 0, new Vector2(PoleX - 8, TopY));

            _flag.Draw(sb, 0, new Vector2(PoleX - 16, FlagY));
            if (_flag.IsPlaceholder) PixelFont.Draw(sb, "</>", PoleX - 15, FlagY + 5, new Color(40, 140, 60));
        }
    }
}
