using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.Characters
{
    /// <summary>
    /// Um personagem jogavel. Definido em Assets/Characters/characters.json.
    /// Todos os personagens tem EXATAMENTE a mesma fisica; muda apenas o visual e os textos.
    ///
    /// Sprites (na pasta "folder" do personagem):
    ///   small.png  - 11 frames de 16 de altura (176x16, ou 352x16 com celulas de 32)
    ///   big.png    - 11 frames de 32 de altura (176x32, ou 352x32 com celulas de 32)
    ///   fire.png   - igual ao big.png - opcional; sem ele usa big.png com tom laranja
    ///   portrait.png - 48x48 (tela de selecao)
    /// Ordem dos frames: ver Player.Frame* e docs/ASSETS.md
    /// </summary>
    public sealed class CharacterDefinition
    {
        public string Id { get; set; } = "dev";
        public string Name { get; set; } = "DEV";
        public string Role { get; set; } = "";
        public string Stack { get; set; } = "";
        public string Description { get; set; } = "";
        public string Folder { get; set; } = "";
        public string Color { get; set; } = "#E04848";
        public bool Enabled { get; set; } = true;

        [JsonIgnore] public SpriteSheet Small { get; private set; }
        [JsonIgnore] public SpriteSheet Big { get; private set; }
        [JsonIgnore] public SpriteSheet Fire { get; private set; }
        [JsonIgnore] public Texture2D Portrait { get; private set; }
        [JsonIgnore] public bool FireIsFallback { get; private set; }
        [JsonIgnore] public Color PlaceholderColor { get; private set; }

        bool _loaded;

        public void EnsureLoaded()
        {
            if (_loaded) return;
            _loaded = true;

            PlaceholderColor = Gfx.ParseHex(Color, new Color(224, 72, 72));
            string folder = string.IsNullOrWhiteSpace(Folder) ? $"Characters/{Id}" : Folder.TrimEnd('/');

            Small = LoadSheet($"{folder}/small.png", 16);
            Big = LoadSheet($"{folder}/big.png", 32);

            if (Assets.Exists($"{folder}/fire.png"))
            {
                Fire = LoadSheet($"{folder}/fire.png", 32);
            }
            else
            {
                // Sem fire.png: reaproveita big.png. O Player aplica um tom alaranjado.
                Fire = new SpriteSheet(Big.Texture, Big.FrameWidth, 32, new Color(255, 160, 64)) { PlaceholderEye = true };
                FireIsFallback = true;
            }

            Portrait = Assets.Texture($"{folder}/portrait.png");
        }

        /// <summary>
        /// A largura do frame vem da imagem (largura / 11), entao celulas de 16 ou 32 px funcionam.
        /// Celulas largas servem para poses abertas (derrapar, morrer, arremessar); o corpo fica centralizado.
        /// </summary>
        SpriteSheet LoadSheet(string path, int height)
        {
            var tex = Assets.Texture(path);
            int width = tex != null ? Math.Max(1, tex.Width / FrameCount) : 16;
            return new SpriteSheet(tex, width, height, PlaceholderColor) { PlaceholderEye = true };
        }

        public const int FrameCount = 11;
    }

    public sealed class CharacterRegistry
    {
        public List<CharacterDefinition> Characters { get; set; } = new();

        /// <summary>Quantidade de "cartas" na tela de selecao (as vazias aparecem como EM BREVE).</summary>
        public int SelectSlots { get; set; } = 4;

        public static CharacterRegistry Load()
        {
            CharacterRegistry registry = null;
            string json = Assets.ReadText("Characters/characters.json");
            if (json != null)
            {
                try
                {
                    registry = JsonSerializer.Deserialize<CharacterRegistry>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true,
                        ReadCommentHandling = JsonCommentHandling.Skip,
                        AllowTrailingCommas = true
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Characters] Erro lendo characters.json: {ex.Message}");
                }
            }

            registry ??= new CharacterRegistry();
            registry.Characters ??= new List<CharacterDefinition>();
            if (registry.Characters.Count == 0)
            {
                registry.Characters.Add(new CharacterDefinition
                {
                    Id = "dev01",
                    Name = "DEV 01",
                    Role = "Full Stack",
                    Folder = "Characters/dev01",
                    Description = "Personagem padrao. Edite Assets/Characters/characters.json."
                });
            }
            return registry;
        }
    }
}
