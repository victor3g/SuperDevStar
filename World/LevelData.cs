using Microsoft.Xna.Framework;

namespace SuperDevStar.World
{
    /// <summary>Conteudo de um arquivo de fase (Assets/Levels/*.txt) ja interpretado.</summary>
    public sealed class LevelData
    {
        public string Id = "1-1";
        public string Name = "HELLO WORLD";
        public string World = "1-1";
        public int Time = 400;
        public string StartArea = "main";
        public readonly Dictionary<string, AreaData> Areas = new(StringComparer.OrdinalIgnoreCase);
        public readonly List<WarpData> Warps = new();
    }

    /// <summary>Uma "sala" da fase (ex: area principal, sala de bonus subterranea).</summary>
    public sealed class AreaData
    {
        public string Id;
        public string Theme = "overworld";
        public string Music = "overworld";
        public Color Sky = new Color(92, 148, 252);
        public readonly List<string> Rows = new();
        public readonly List<DecorData> Decor = new();
        public readonly List<BackgroundLayerData> Backgrounds = new();
    }

    public sealed class DecorData
    {
        public string Name;
        public int TileX;
        /// <summary>Linha do tile onde a BASE da imagem encosta (a imagem cresce para cima).</summary>
        public int TileY;
        public bool Front;
    }

    public sealed class BackgroundLayerData
    {
        public string Path;
        public float Parallax = 0.25f;
        public int Y;
    }

    public enum WarpDirection { Down, Right }
    public enum WarpExit { Drop, Rise }

    public sealed class WarpData
    {
        public string FromArea;
        public int FromX, FromY;
        public WarpDirection Direction;
        public string ToArea;
        public int ToX, ToY;
        public WarpExit Exit;
    }
}
