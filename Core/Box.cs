using Microsoft.Xna.Framework;

namespace SuperDevStar.Core
{
    /// <summary>Retangulo com coordenadas float (hitboxes).</summary>
    public readonly struct Box
    {
        public readonly float X, Y, W, H;

        public Box(float x, float y, float w, float h)
        {
            X = x; Y = y; W = w; H = h;
        }

        public float Left => X;
        public float Right => X + W;
        public float Top => Y;
        public float Bottom => Y + H;

        public bool Intersects(Box o) => X < o.X + o.W && o.X < X + W && Y < o.Y + o.H && o.Y < Y + H;

        public Rectangle ToRectangle() =>
            new Rectangle((int)MathF.Floor(X), (int)MathF.Floor(Y), (int)MathF.Round(W), (int)MathF.Round(H));
    }
}
