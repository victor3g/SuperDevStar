using System.Text;
using SuperDevStar.Characters;

namespace SuperDevStar.Core
{
    /// <summary>
    /// Lista oficial de arquivos que o jogo procura. Ao iniciar, gera "missing_assets.txt"
    /// ao lado do executavel com tudo que ainda falta produzir.
    /// (Mesma lista documentada em docs/ASSETS.md)
    /// </summary>
    public static class AssetManifest
    {
        public readonly record struct Entry(string Path, string Size, string Description, bool Optional = false);

        public static readonly Entry[] Common =
        {
            // ---------- Tiles (fase externa) ----------
            new("Tiles/overworld/ground.png", "16x16", "Chao - placa-mae / PCB"),
            new("Tiles/overworld/brick.png", "16x16", "Bloco quebravel - codigo legado"),
            new("Tiles/overworld/question.png", "48x16 (3 frames)", "Bloco ? - 'Commit block' animado"),
            new("Tiles/overworld/used.png", "16x16", "Bloco ja usado (vazio)"),
            new("Tiles/overworld/hard.png", "16x16", "Bloco solido - chip/CPU (escadas)"),
            new("Tiles/overworld/pipe_top_left.png", "16x16", "Boca do duto (esquerda)"),
            new("Tiles/overworld/pipe_top_right.png", "16x16", "Boca do duto (direita)"),
            new("Tiles/overworld/pipe_left.png", "16x16", "Corpo do duto (esquerda)"),
            new("Tiles/overworld/pipe_right.png", "16x16", "Corpo do duto (direita)"),
            new("Tiles/overworld/hpipe_mouth_top.png", "16x16", "Duto horizontal - boca (cima)"),
            new("Tiles/overworld/hpipe_mouth_bottom.png", "16x16", "Duto horizontal - boca (baixo)"),
            new("Tiles/overworld/hpipe_body_top.png", "16x16", "Duto horizontal - corpo (cima)"),
            new("Tiles/overworld/hpipe_body_bottom.png", "16x16", "Duto horizontal - corpo (baixo)"),

            // ---------- Tiles (subsolo / sala de servidores) ----------
            new("Tiles/underground/ground.png", "16x16", "Chao do subsolo (piso elevado de datacenter)", true),
            new("Tiles/underground/brick.png", "16x16", "Bloco quebravel do subsolo", true),
            new("Tiles/underground/hard.png", "16x16", "Bloco solido do subsolo", true),
            new("Tiles/underground/used.png", "16x16", "Bloco usado do subsolo", true),

            // ---------- Inimigos ----------
            new("Enemies/bug.png", "48x16 (3 frames)", "Bug (goomba): andar1, andar2, esmagado"),
            new("Enemies/virus.png", "32x24 (2 frames)", "Virus (koopa): andar1, andar2"),
            new("Enemies/virus_shell.png", "32x16 (2 frames)", "Capsula do virus (casco): parado, acordando"),

            // ---------- Itens ----------
            new("Items/coin.png", "48x16 (3 frames)", "Moeda (bit coin) brilhando"),
            new("Items/coin_spin.png", "64x16 (4 frames)", "Moeda girando (sai do bloco)"),
            new("Items/coffee.png", "16x16", "Cafe (cogumelo) - vira Senior"),
            new("Items/firewall.png", "64x16 (4 frames)", "Firewall (flor de fogo)"),
            new("Items/sudo_star.png", "64x16 (4 frames)", "Sudo Star (estrela)"),
            new("Items/backup.png", "16x16", "Backup / disquete verde (1UP)"),
            new("Items/packet.png", "32x8 (4 frames)", "Pacote de dados (bola de fogo)"),

            // ---------- Efeitos ----------
            new("Effects/brick_debris.png", "16x8 (2 frames)", "Pedacos do bloco quebrado"),
            new("Effects/explosion.png", "48x16 (3 frames)", "Explosao do pacote"),
            new("Effects/firework.png", "48x16 (3 frames)", "Fogos no fim da fase"),

            // ---------- Objetos ----------
            new("Objects/flagpole.png", "16x16", "Segmento do mastro (antena)"),
            new("Objects/flagpole_top.png", "16x16", "Topo do mastro"),
            new("Objects/flag.png", "16x16", "Bandeira de deploy"),

            // ---------- Decoracao (cenario) ----------
            new("Decor/datacenter.png", "80x80", "Castelo final = Data Center"),
            new("Decor/cloud_small.png", "32x24", "Nuvem pequena"),
            new("Decor/cloud_medium.png", "48x24", "Nuvem media"),
            new("Decor/cloud_large.png", "64x24", "Nuvem grande"),
            new("Decor/hill_small.png", "48x24", "Morro pequeno (pilha de servidores)"),
            new("Decor/hill_large.png", "80x40", "Morro grande (pilha de servidores)"),
            new("Decor/bush_small.png", "32x16", "Arbusto pequeno (cabos emaranhados)"),
            new("Decor/bush_medium.png", "48x16", "Arbusto medio"),
            new("Decor/bush_large.png", "64x16", "Arbusto grande"),
            new("Decor/sign_welcome.png", "32x32", "Placa 'Hello World' no inicio"),
            new("Decor/server_rack.png", "16x32", "Rack de servidor (subsolo)", true),

            // ---------- Fundos com parallax ----------
            new("Backgrounds/overworld_far.png", "512x240", "Skyline de tecnologia ao fundo", true),
            new("Backgrounds/underground_far.png", "256x240", "Fundo do subsolo", true),

            // ---------- Interface ----------
            new("UI/logo.png", "ate 224x80", "Logo do jogo"),
            new("UI/title_background.png", "256x240", "Fundo da tela de titulo", true),
            new("UI/select_background.png", "256x240", "Fundo da selecao de personagem", true),
            new("UI/hud_coin.png", "24x8 (3 frames)", "Moedinha do HUD"),
        };

        public static readonly string[] SoundEffects =
        {
            "jump_small", "jump_big", "coin", "bump", "break", "powerup_appear", "powerup", "pipe", "1up",
            "stomp", "kick", "fireball", "die", "flagpole", "pause", "hurry", "tick", "firework",
            "menu_move", "menu_select", "game_over"
        };

        public static readonly string[] Music = { "title", "select", "overworld", "underground", "star", "stage_clear", "ending" };

        public static IEnumerable<Entry> All(CharacterRegistry characters)
        {
            foreach (var e in Common) yield return e;
            foreach (var c in characters.Characters)
            {
                string folder = string.IsNullOrWhiteSpace(c.Folder) ? $"Characters/{c.Id}" : c.Folder.TrimEnd('/');
                yield return new Entry($"{folder}/small.png", "176x16 ou 352x16 (11 frames)", $"{c.Name} pequeno (Junior)");
                yield return new Entry($"{folder}/big.png", "176x32 ou 352x32 (11 frames)", $"{c.Name} grande (Senior)");
                yield return new Entry($"{folder}/fire.png", "igual ao big.png", $"{c.Name} com Firewall", true);
                yield return new Entry($"{folder}/portrait.png", "48x48", $"{c.Name} retrato da selecao");
            }
            foreach (var s in SoundEffects) yield return new Entry($"Audio/Sfx/{s}.wav", "WAV PCM", "Efeito sonoro", true);
            foreach (var m in Music) yield return new Entry($"Audio/Music/{m}.wav", "WAV PCM (loop)", "Musica", true);
        }

        public static void WriteMissingReport(CharacterRegistry characters)
        {
            try
            {
                var sb = new StringBuilder();
                sb.AppendLine("SUPER DEV STAR - arquivos ainda nao encontrados em Assets/");
                sb.AppendLine("(o jogo funciona sem eles usando placeholders coloridos)");
                sb.AppendLine();
                int missing = 0;
                foreach (var e in All(characters))
                {
                    if (Assets.Exists(e.Path)) continue;
                    missing++;
                    sb.AppendLine($"{(e.Optional ? "[opcional] " : "")}{e.Path,-48} {e.Size,-26} {e.Description}");
                }
                sb.Insert(0, $"Total faltando: {missing}{Environment.NewLine}");
                File.WriteAllText(Path.Combine(AppContext.BaseDirectory, "missing_assets.txt"), sb.ToString());
                Console.WriteLine($"[Assets] {missing} arquivo(s) faltando. Veja missing_assets.txt");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Assets] Nao foi possivel gerar relatorio: {ex.Message}");
            }
        }
    }
}
