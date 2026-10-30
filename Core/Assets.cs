using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Audio;
using Microsoft.Xna.Framework.Graphics;

namespace SuperDevStar.Core
{
    /// <summary>
    /// Carrega PNG e WAV direto do disco (pasta Assets ao lado do executavel).
    /// Arquivos ausentes NAO quebram o jogo: retornam null e o jogo desenha um placeholder colorido.
    /// </summary>
    public static class Assets
    {
        static GraphicsDevice _device;
        static readonly Dictionary<string, Texture2D> Textures = new(StringComparer.OrdinalIgnoreCase);
        static readonly Dictionary<string, SoundEffect> Sounds = new(StringComparer.OrdinalIgnoreCase);
        static readonly SortedSet<string> MissingFiles = new(StringComparer.OrdinalIgnoreCase);

        public static string Root { get; private set; }
        public static Texture2D Pixel { get; private set; }
        public static IEnumerable<string> Missing => MissingFiles;

        public static void Init(GraphicsDevice device, string root)
        {
            _device = device;
            Root = root;
            Pixel = new Texture2D(device, 1, 1);
            Pixel.SetData(new[] { Color.White });
        }

        public static string FullPath(string relative) =>
            Path.Combine(Root, relative.Replace('/', Path.DirectorySeparatorChar));

        public static bool Exists(string relative) => File.Exists(FullPath(relative));

        public static Texture2D Texture(string relative)
        {
            if (Textures.TryGetValue(relative, out var cached)) return cached;

            Texture2D tex = null;
            string path = FullPath(relative);
            if (File.Exists(path))
            {
                try
                {
                    using var fs = File.OpenRead(path);
                    tex = Texture2D.FromStream(_device, fs);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Assets] Falha ao carregar {relative}: {ex.Message}");
                }
            }
            else
            {
                MissingFiles.Add(relative);
            }

            Textures[relative] = tex;
            return tex;
        }

        /// <summary>Somente WAV PCM (limitacao do SoundEffect.FromStream).</summary>
        public static SoundEffect Sound(string relative)
        {
            if (Sounds.TryGetValue(relative, out var cached)) return cached;

            SoundEffect sfx = null;
            string path = FullPath(relative);
            if (File.Exists(path))
            {
                try
                {
                    using var fs = File.OpenRead(path);
                    sfx = SoundEffect.FromStream(fs);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Assets] Falha ao carregar som {relative}: {ex.Message}");
                }
            }
            else
            {
                MissingFiles.Add(relative);
            }

            Sounds[relative] = sfx;
            return sfx;
        }

        public static string ReadText(string relative)
        {
            string path = FullPath(relative);
            return File.Exists(path) ? File.ReadAllText(path) : null;
        }
    }
}
