using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.World
{
    /// <summary>
    /// Elemento decorativo do cenario (nao colide). Imagem em Assets/Decor/{nome}.png,
    /// ancorada pela BASE: a parte de baixo da imagem encosta no fundo do tile indicado.
    /// </summary>
    public sealed class DecorInstance
    {
        public readonly string Name;
        public readonly float X;
        public readonly float BottomY;
        public readonly bool Centered;
        public readonly bool Front;

        Texture2D _texture;
        bool _loaded;

        public DecorInstance(string name, float x, float bottomY, bool centered, bool front)
        {
            Name = name;
            X = x;
            BottomY = bottomY;
            Centered = centered;
            Front = front;
        }

        public void Draw(SpriteBatch sb, Camera2D cam)
        {
            if (!_loaded)
            {
                _texture = Assets.Texture($"Decor/{Name}.png");
                _loaded = true;
            }

            var info = DecorCatalog.Get(Name);
            int w = _texture?.Width ?? info.Width;
            int h = _texture?.Height ?? info.Height;
            float x = Centered ? X - w / 2f : X;
            float y = BottomY - h;
            if (x + w < cam.X - 4 || x > cam.X + cam.Width + 4) return;

            if (_texture != null)
                sb.Draw(_texture, new Vector2((int)x, (int)y), Color.White);
            else
                Gfx.Placeholder(sb, new Rectangle((int)x, (int)y, w, h), info.Color);
        }
    }

    /// <summary>Tamanho/cor dos placeholders de decoracao enquanto a arte nao existe.</summary>
    public static class DecorCatalog
    {
        public readonly record struct Info(int Width, int Height, Color Color);

        static readonly Dictionary<string, Info> Known = new(StringComparer.OrdinalIgnoreCase)
        {
            ["cloud_small"] = new(32, 24, new Color(255, 255, 255, 160)),
            ["cloud_medium"] = new(48, 24, new Color(255, 255, 255, 160)),
            ["cloud_large"] = new(64, 24, new Color(255, 255, 255, 160)),
            ["hill_small"] = new(48, 24, new Color(40, 110, 80, 200)),
            ["hill_large"] = new(80, 40, new Color(40, 110, 80, 200)),
            ["bush_small"] = new(32, 16, new Color(60, 170, 90, 200)),
            ["bush_medium"] = new(48, 16, new Color(60, 170, 90, 200)),
            ["bush_large"] = new(64, 16, new Color(60, 170, 90, 200)),
            ["datacenter"] = new(80, 80, new Color(150, 150, 170)),
            ["sign_welcome"] = new(32, 32, new Color(220, 200, 150)),
            ["server_rack"] = new(16, 32, new Color(70, 70, 90)),
        };

        public static Info Get(string name) =>
            Known.TryGetValue(name, out var info) ? info : new Info(16, 16, new Color(255, 0, 255, 120));
    }

    /// <summary>Camada de fundo repetida na horizontal, com parallax (desenhada em coordenadas de tela).</summary>
    public sealed class BackgroundLayer
    {
        readonly BackgroundLayerData _data;
        Texture2D _texture;
        bool _loaded;

        public BackgroundLayer(BackgroundLayerData data)
        {
            _data = data;
        }

        public void Draw(SpriteBatch sb, Camera2D cam)
        {
            if (!_loaded)
            {
                _texture = Assets.Texture(_data.Path);
                _loaded = true;
            }
            if (_texture == null || _texture.Width == 0) return;

            float offset = -(cam.X * _data.Parallax) % _texture.Width;
            if (offset > 0) offset -= _texture.Width;
            for (float x = offset; x < cam.Width; x += _texture.Width)
                sb.Draw(_texture, new Vector2((int)MathF.Round(x), _data.Y), Color.White);
        }
    }
}
