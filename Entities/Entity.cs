using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;
using SuperDevStar.World;

namespace SuperDevStar.Entities
{
    public enum DrawLayer { BehindTiles = 0, Normal = 1, Front = 2 }

    /// <summary>
    /// Base de tudo que se move. Position = canto superior esquerdo da HITBOX.
    /// Velocidades em pixels por frame (60 FPS), como no jogo original.
    /// </summary>
    public abstract class Entity
    {
        const int T = GameConstants.TileSize;
        protected const float Eps = 0.01f;

        public Stage Stage;
        public Vector2 Position;
        public Vector2 PrevPosition;
        public Vector2 Velocity;
        public float Width = 16f;
        public float Height = 16f;
        public bool Removed;
        public bool OnGround;
        public bool HitWall;
        public bool HitCeiling;
        public DrawLayer Layer = DrawLayer.Normal;

        public float Left => Position.X;
        public float Right => Position.X + Width;
        public float Top => Position.Y;
        public float Bottom => Position.Y + Height;
        public float CenterX => Position.X + Width / 2f;
        public float CenterY => Position.Y + Height / 2f;
        public float PrevBottom => PrevPosition.Y + Height;
        public Box Bounds => new Box(Position.X, Position.Y, Width, Height);

        protected TileMap Map => Stage.Map;

        public virtual bool InteractsWithPlayer => false;
        public virtual void OnTouchPlayer(Player player) { }
        public virtual void Update() { }
        public abstract void Draw(SpriteBatch sb);

        public virtual void DrawDebug(SpriteBatch sb) => Gfx.Outline(sb, Bounds.ToRectangle(), Color.Red);

        public bool IsOnScreen(float margin = 0f) =>
            Right >= Stage.Camera.X - margin && Left <= Stage.Camera.X + Stage.Camera.Width + margin;

        protected virtual bool IsSolidAt(int tx, int ty) => Map.IsSolid(tx, ty);

        /// <summary>Somente o jogador ativa blocos invisiveis (batendo de baixo para cima).</summary>
        protected virtual bool CanHitInvisibleBlocks => false;

        /// <summary>Chamado com o tile mais proximo do centro quando bate a cabeca.</summary>
        protected virtual void OnHeadBump(int tx, int ty) { }

        protected void ApplyGravity(float gravity, float maxFall)
        {
            Velocity.Y = Math.Min(Velocity.Y + gravity, maxFall);
        }

        protected void MoveX(float dx)
        {
            HitWall = false;
            if (dx == 0f) return;
            Position.X += dx;

            int top = (int)MathF.Floor(Position.Y / T);
            int bottom = (int)MathF.Floor((Position.Y + Height - Eps) / T);

            if (dx > 0)
            {
                int tx = (int)MathF.Floor((Position.X + Width - Eps) / T);
                for (int ty = top; ty <= bottom; ty++)
                {
                    if (!IsSolidAt(tx, ty)) continue;
                    Position.X = tx * T - Width;
                    HitWall = true;
                    break;
                }
            }
            else
            {
                int tx = (int)MathF.Floor(Position.X / T);
                for (int ty = top; ty <= bottom; ty++)
                {
                    if (!IsSolidAt(tx, ty)) continue;
                    Position.X = (tx + 1) * T;
                    HitWall = true;
                    break;
                }
            }
        }

        protected void MoveY(float dy)
        {
            OnGround = false;
            HitCeiling = false;
            if (dy == 0f) return;

            float prevTop = Position.Y;
            Position.Y += dy;

            int left = (int)MathF.Floor(Position.X / T);
            int right = (int)MathF.Floor((Position.X + Width - Eps) / T);

            if (dy > 0)
            {
                int ty = (int)MathF.Floor((Position.Y + Height - Eps) / T);
                for (int tx = left; tx <= right; tx++)
                {
                    if (!IsSolidAt(tx, ty)) continue;
                    Position.Y = ty * T - Height;
                    OnGround = true;
                    break;
                }
            }
            else
            {
                int ty = (int)MathF.Floor(Position.Y / T);
                int best = int.MinValue;
                float bestDist = float.MaxValue;
                for (int tx = left; tx <= right; tx++)
                {
                    bool solid = IsSolidAt(tx, ty)
                        || (CanHitInvisibleBlocks && Map.IsInvisibleBlock(tx, ty) && prevTop >= (ty + 1) * T - Eps);
                    if (!solid) continue;
                    float dist = Math.Abs(tx * T + T / 2f - CenterX);
                    if (dist < bestDist)
                    {
                        bestDist = dist;
                        best = tx;
                    }
                }
                if (best != int.MinValue)
                {
                    Position.Y = (ty + 1) * T;
                    HitCeiling = true;
                    OnHeadBump(best, ty);
                }
            }
        }
    }
}
