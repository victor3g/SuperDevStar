using SuperDevStar.Characters;
using SuperDevStar.Entities;

namespace SuperDevStar.Core
{
    /// <summary>Estado da partida atual (vidas, pontos, moedas, poder, checkpoint).</summary>
    public sealed class GameSession
    {
        public CharacterDefinition Character { get; }
        public int Lives = GameConstants.StartingLives;
        public int Score;
        public int Coins;
        public PowerState Power = PowerState.Small;
        public bool CheckpointReached;

        public GameSession(CharacterDefinition character)
        {
            Character = character;
        }

        public void AddScore(int points) => Score = Math.Min(999999, Score + points);

        /// <summary>Retorna true quando completou 100 moedas (ganhou vida).</summary>
        public bool AddCoin()
        {
            Coins++;
            if (Coins < 100) return false;
            Coins = 0;
            Lives++;
            return true;
        }
    }

    /// <summary>Recorde salvo em %LOCALAPPDATA%/SuperDevStar/save.txt.</summary>
    public static class SaveData
    {
        public static int TopScore { get; private set; }

        static string FilePath => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SuperDevStar", "save.txt");

        public static void Load()
        {
            try
            {
                if (File.Exists(FilePath) && int.TryParse(File.ReadAllText(FilePath).Trim(), out int v)) TopScore = v;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Save] {ex.Message}");
            }
        }

        public static void SubmitScore(int score)
        {
            if (score <= TopScore) return;
            TopScore = score;
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(FilePath));
                File.WriteAllText(FilePath, score.ToString());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Save] {ex.Message}");
            }
        }
    }
}
