namespace SuperDevStar.Core
{
    public static class GameConstants
    {
        /// <summary>Resolucao interna (mesma do NES). Tudo e desenhado nela e depois escalado.</summary>
        public const int VirtualWidth = 256;
        public const int VirtualHeight = 240;

        /// <summary>Escala inicial da janela (256x240 * 3 = 768x720).</summary>
        public const int WindowScale = 3;

        /// <summary>Tamanho de um tile em pixels. TODOS os cenarios seguem essa grade.</summary>
        public const int TileSize = 16;

        /// <summary>Pasta (ao lado do executavel) com imagens, sons, fases e personagens.</summary>
        public const string AssetsFolder = "Assets";

        public const int StartingLives = 3;
    }
}
