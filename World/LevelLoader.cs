using System.Globalization;
using Microsoft.Xna.Framework;
using SuperDevStar.Core;

namespace SuperDevStar.World
{
    /// <summary>
    /// Le o formato texto das fases. Veja docs/LEVEL_FORMAT.md.
    ///
    ///   [level]            name = ..., world = 1-1, time = 400, start = main
    ///   [area main]        theme, music, sky, background
    ///   [decor main]       nome  x  y  [front]
    ///   [map main]         linhas do mapa (1 caractere = 1 tile de 16x16)
    ///   [warps]            main 57 9 down -> bonus 2 2 drop
    /// Comentarios comecam com // (exceto dentro de [map]).
    /// </summary>
    public static class LevelLoader
    {
        public static LevelData Parse(string id, string text)
        {
            var level = new LevelData { Id = id };
            string section = "level";
            AreaData area = null;
            int lineNumber = 0;

            foreach (string raw in text.Replace("\r", "").Split('\n'))
            {
                lineNumber++;
                string trimmed = raw.Trim();

                if (trimmed.StartsWith("[") && trimmed.EndsWith("]"))
                {
                    var parts = trimmed.Substring(1, trimmed.Length - 2).Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    section = parts.Length > 0 ? parts[0].ToLowerInvariant() : "";
                    string arg = parts.Length > 1 ? parts[1] : "main";
                    if (section is "area" or "map" or "decor") area = GetArea(level, arg);
                    continue;
                }

                if (section == "map")
                {
                    if (trimmed.Length == 0 || trimmed.StartsWith("//")) continue;
                    area.Rows.Add(raw.TrimEnd());
                    continue;
                }

                if (trimmed.Length == 0 || trimmed.StartsWith("//")) continue;

                try
                {
                    switch (section)
                    {
                        case "level": ParseLevelProperty(level, trimmed); break;
                        case "area": ParseAreaProperty(area, trimmed); break;
                        case "decor": ParseDecor(area, trimmed); break;
                        case "warps": ParseWarp(level, trimmed); break;
                    }
                }
                catch (Exception ex)
                {
                    throw new InvalidDataException($"Fase {id}, linha {lineNumber}: {ex.Message}", ex);
                }
            }

            if (!level.Areas.ContainsKey(level.StartArea))
                throw new InvalidDataException($"Fase {id}: area inicial '{level.StartArea}' nao existe.");
            foreach (var a in level.Areas.Values)
                if (a.Rows.Count == 0) throw new InvalidDataException($"Fase {id}: area '{a.Id}' sem [map].");

            return level;
        }

        static AreaData GetArea(LevelData level, string id)
        {
            if (!level.Areas.TryGetValue(id, out var area))
            {
                area = new AreaData { Id = id };
                level.Areas[id] = area;
            }
            return area;
        }

        static (string key, string value) KeyValue(string line)
        {
            int i = line.IndexOf('=');
            if (i < 0) throw new FormatException($"esperado 'chave = valor' em '{line}'");
            return (line.Substring(0, i).Trim().ToLowerInvariant(), line.Substring(i + 1).Trim());
        }

        static void ParseLevelProperty(LevelData level, string line)
        {
            var (key, value) = KeyValue(line);
            switch (key)
            {
                case "name": level.Name = value; break;
                case "world": level.World = value; break;
                case "time": level.Time = int.Parse(value, CultureInfo.InvariantCulture); break;
                case "start": level.StartArea = value; break;
            }
        }

        static void ParseAreaProperty(AreaData area, string line)
        {
            var (key, value) = KeyValue(line);
            switch (key)
            {
                case "theme": area.Theme = value.ToLowerInvariant(); break;
                case "music": area.Music = value; break;
                case "sky": area.Sky = Gfx.ParseHex(value, area.Sky); break;
                case "background":
                    var p = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    var layer = new BackgroundLayerData { Path = p[0] };
                    if (p.Length > 1) layer.Parallax = float.Parse(p[1], CultureInfo.InvariantCulture);
                    if (p.Length > 2) layer.Y = int.Parse(p[2], CultureInfo.InvariantCulture);
                    area.Backgrounds.Add(layer);
                    break;
            }
        }

        static void ParseDecor(AreaData area, string line)
        {
            var p = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (p.Length < 3) throw new FormatException($"decor precisa de 'nome x y': '{line}'");
            area.Decor.Add(new DecorData
            {
                Name = p[0],
                TileX = int.Parse(p[1], CultureInfo.InvariantCulture),
                TileY = int.Parse(p[2], CultureInfo.InvariantCulture),
                Front = p.Length > 3 && p[3].Equals("front", StringComparison.OrdinalIgnoreCase)
            });
        }

        static void ParseWarp(LevelData level, string line)
        {
            var p = line.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(s => s != "->").ToArray();
            if (p.Length < 8) throw new FormatException($"warp precisa de 'area x y down|right -> area x y drop|rise': '{line}'");
            level.Warps.Add(new WarpData
            {
                FromArea = p[0],
                FromX = int.Parse(p[1], CultureInfo.InvariantCulture),
                FromY = int.Parse(p[2], CultureInfo.InvariantCulture),
                Direction = p[3].Equals("right", StringComparison.OrdinalIgnoreCase) ? WarpDirection.Right : WarpDirection.Down,
                ToArea = p[4],
                ToX = int.Parse(p[5], CultureInfo.InvariantCulture),
                ToY = int.Parse(p[6], CultureInfo.InvariantCulture),
                Exit = p[7].Equals("rise", StringComparison.OrdinalIgnoreCase) ? WarpExit.Rise : WarpExit.Drop
            });
        }
    }

    /// <summary>Ordem das fases em Assets/Levels/levels.txt (uma por linha).</summary>
    public static class LevelManager
    {
        static List<string> _order;

        public static List<string> Order
        {
            get
            {
                if (_order == null)
                {
                    string txt = Assets.ReadText("Levels/levels.txt");
                    _order = txt?.Replace("\r", "").Split('\n')
                        .Select(s => s.Trim())
                        .Where(s => s.Length > 0 && !s.StartsWith("//"))
                        .ToList() ?? new List<string>();
                    if (_order.Count == 0) _order.Add("1-1");
                }
                return _order;
            }
        }

        public static string First => Order[0];

        public static string Next(string id)
        {
            int i = Order.IndexOf(id);
            return i >= 0 && i + 1 < Order.Count ? Order[i + 1] : null;
        }

        public static LevelData Load(string id)
        {
            string text = Assets.ReadText($"Levels/{id}.txt")
                ?? throw new FileNotFoundException($"Fase nao encontrada: Assets/Levels/{id}.txt");
            return LevelLoader.Parse(id, text);
        }
    }
}
