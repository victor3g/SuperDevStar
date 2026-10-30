using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.World
{
    public enum TileType : byte
    {
        Empty,
        Ground,
        Brick,
        Question,
        Used,
        Hard,
        Invisible,
        PipeTopLeft,
        PipeTopRight,
        PipeLeft,
        PipeRight,
        HPipeMouthTop,
        HPipeMouthBottom,
        HPipeBodyTop,
        HPipeBodyBottom
    }

    public enum BlockContent : byte { None, Coin, MultiCoin, PowerUp, Star, OneUp }

    public struct Tile
    {
        public TileType Type;
        public BlockContent Content;
        public int BumpTimer;
        /// <summary>Bloco de varias moedas: tempo restante (frames) depois da primeira batida.</summary>
        public int MultiCoinTimer;
        public bool MultiCoinStarted;
        public int CoinsGiven;

        public bool IsSolid => Type != TileType.Empty && Type != TileType.Invisible;
    }

    public sealed class TileMap
    {
        const int T = GameConstants.TileSize;
        public const int BumpDuration = 10;
        static readonly int[] QuestionFrames = { 0, 0, 0, 1, 2, 1 };

        readonly Tile[] _tiles;

        public int Width { get; }
        public int Height { get; }
        public float WidthPx => Width * T;
        public float HeightPx => Height * T;

        public TileMap(int width, int height)
        {
            Width = width;
            Height = height;
            _tiles = new Tile[width * height];
        }

        public bool InBounds(int x, int y) => x >= 0 && y >= 0 && x < Width && y < Height;

        public ref Tile this[int x, int y] => ref _tiles[y * Width + x];

        /// <summary>Fora do mapa: laterais sao paredes, acima e abaixo sao vazios (buracos matam).</summary>
        public bool IsSolid(int x, int y)
        {
            if (x < 0 || x >= Width) return true;
            if (y < 0 || y >= Height) return false;
            return _tiles[y * Width + x].IsSolid;
        }

        public bool IsInvisibleBlock(int x, int y) =>
            InBounds(x, y) && _tiles[y * Width + x].Type == TileType.Invisible;

        public void Update()
        {
            for (int i = 0; i < _tiles.Length; i++)
            {
                ref Tile t = ref _tiles[i];
                if (t.BumpTimer > 0) t.BumpTimer--;
                if (t.MultiCoinStarted && t.MultiCoinTimer > 0) t.MultiCoinTimer--;
            }
        }

        public void Draw(SpriteBatch sb, TileSet set, Camera2D cam, int frameCounter)
        {
            int x0 = Math.Max(0, (int)(cam.X / T) - 1);
            int x1 = Math.Min(Width - 1, (int)((cam.X + cam.Width) / T) + 1);
            int qFrame = QuestionFrames[(frameCounter / 8) % QuestionFrames.Length];

            for (int y = 0; y < Height; y++)
            {
                for (int x = x0; x <= x1; x++)
                {
                    ref Tile t = ref this[x, y];
                    if (t.Type == TileType.Empty || t.Type == TileType.Invisible) continue;

                    float offset = 0f;
                    if (t.BumpTimer > 0)
                    {
                        float p = (BumpDuration - t.BumpTimer) / (float)BumpDuration;
                        offset = -MathF.Sin(p * MathF.PI) * 5f;
                    }
                    set.Draw(sb, t.Type, new Vector2(x * T, y * T + offset), t.Type == TileType.Question ? qFrame : 0);
                }
            }
        }
    }
}
