using Microsoft.Xna.Framework;

namespace SuperDevStar.Core
{
    /// <summary>Camera horizontal estilo SMB: so anda para a direita, nunca volta.</summary>
    public sealed class Camera2D
    {
        public float X;
        public float Y;
        public int Width = GameConstants.VirtualWidth;
        public int Height = GameConstants.VirtualHeight;
        public bool LockLeft = true;

        public Matrix Transform => Matrix.CreateTranslation(-MathF.Round(X), -MathF.Round(Y), 0f);

        public void Follow(float targetCenterX, float worldWidth)
        {
            float desired = targetCenterX - Width * 0.5f;
            if (!LockLeft || desired > X) X = desired;
            Clamp(worldWidth);
        }

        public void CenterOn(float targetCenterX, float worldWidth)
        {
            X = targetCenterX - Width * 0.5f;
            Clamp(worldWidth);
        }

        void Clamp(float worldWidth)
        {
            X = Math.Clamp(X, 0f, Math.Max(0f, worldWidth - Width));
        }
    }
}
