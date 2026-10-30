namespace SuperDevStar
{
    public static class Program
    {
        [STAThread]
        public static void Main()
        {
            using var game = new SuperDevStarGame();
            game.Run();
        }
    }
}
