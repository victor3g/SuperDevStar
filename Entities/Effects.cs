using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.Entities
{
    /// <summary>Moeda que pula para fora do bloco.</summary>
    public sealed class CoinPop : Entity
    {
        readonly SpriteSheet _sheet = Sprites.Get("Items/coin_spin.png", 16, 16, new Color(252, 200, 40));
        readonly float _startY;
        int _anim;

        public CoinPop(float x, float y)
        {
            Position = new Vector2(x, y);
            _startY = y;
            Velocity.Y = -5f;
            Layer = DrawLayer.Front;
        }

        public override void Update()
        {
            _anim++;
            Velocity.Y += 0.3f;
            Position.Y += Velocity.Y;
            if (Velocity.Y > 0 && Position.Y >= _startY - 8f)
            {
                Removed = true;
                Stage.Spawn(new ScorePopup("200", CenterX, Position.Y));
            }
        }

        public override void Draw(SpriteBatch sb)
        {
            if (_sheet.IsPlaceholder)
            {
                int w = new[] { 10, 6, 2, 6 }[(_anim / 3) % 4];
                Gfx.Placeholder(sb, new Rectangle((int)(Position.X + 8 - w / 2), (int)Position.Y + 1, w, 14), _sheet.Fallback);
                return;
            }
            _sheet.Draw(sb, (_anim / 3) % 4, Position);
        }
    }

    /// <summary>Pedaco de bloco quebrado.</summary>
    public sealed class BrickDebris : Entity
    {
        readonly SpriteSheet _sheet;
        int _anim;

        public BrickDebris(float x, float y, float vx, float vy, string theme)
        {
            Width = 8f;
            Height = 8f;
            Position = new Vector2(x, y);
            Velocity = new Vector2(vx, vy);
            Layer = DrawLayer.Front;
            _sheet = Sprites.Themed("Effects", "brick_debris", theme, 8, 8, new Color(200, 76, 12));
        }

        public override void Update()
        {
            _anim++;
            Velocity.Y += 0.35f;
            Position += Velocity;
            if (Top > Stage.Map.HeightPx + 16) Removed = true;
        }

        public override void Draw(SpriteBatch sb)
        {
            int step = (_anim / 4) % 4;
            _sheet.Draw(sb, step % 2, Position, step >= 2, null, step == 1 || step == 2);
        }
    }

    /// <summary>Numero de pontos subindo na tela.</summary>
    public sealed class ScorePopup : Entity
    {
        readonly string _text;
        int _life;

        public ScorePopup(string text, float centerX, float y)
        {
            _text = text;
            Position = new Vector2(centerX, y - 8f);
            Layer = DrawLayer.Front;
        }

        public override void Update()
        {
            _life++;
            if (_life < 30) Position.Y -= 1f;
            if (_life > 45) Removed = true;
        }

        public override void Draw(SpriteBatch sb)
        {
            PixelFont.DrawCentered(sb, _text, Position.X, Position.Y, Color.White, 1, shadow: true);
        }
    }

    /// <summary>Explosao curta (pacote batendo, fogos de artificio).</summary>
    public sealed class Explosion : Entity
    {
        readonly SpriteSheet _sheet;
        readonly int _frameTime;
        int _anim;

        public Explosion(float centerX, float centerY, bool firework = false)
        {
            Position = new Vector2(centerX - 8f, centerY - 8f);
            Layer = DrawLayer.Front;
            _frameTime = firework ? 8 : 4;
            _sheet = Sprites.Get(firework ? "Effects/firework.png" : "Effects/explosion.png", 16, 16,
                firework ? new Color(255, 120, 200) : new Color(255, 160, 40));
        }

        public override void Update()
        {
            if (++_anim >= _frameTime * 3) Removed = true;
        }

        public override void Draw(SpriteBatch sb)
        {
            int frame = Math.Min(2, _anim / _frameTime);
            if (_sheet.IsPlaceholder)
            {
                int s = 6 + frame * 4;
                Gfx.Placeholder(sb, new Rectangle((int)(Position.X + 8 - s / 2), (int)(Position.Y + 8 - s / 2), s, s), _sheet.Fallback);
                return;
            }
            _sheet.Draw(sb, frame, Position);
        }
    }

    /// <summary>PACOTE DE DADOS - equivalente a bola de fogo. Quica no chao, explode na parede.</summary>
    public sealed class PacketProjectile : Entity
    {
        readonly SpriteSheet _sheet = Sprites.Get("Items/packet.png", 8, 8, new Color(255, 140, 40));
        int _anim;

        public PacketProjectile(Player p)
        {
            Width = 8f;
            Height = 8f;
            int dir = p.Facing;
            Position = new Vector2(dir > 0 ? p.Right - 2f : p.Left - 6f, p.Top + 4f);
            Velocity = new Vector2(dir * 4f, 3f);
            Layer = DrawLayer.Front;
        }

        public override void Update()
        {
            _anim++;
            ApplyGravity(0.35f, 4f);
            float vx = Velocity.X;
            MoveX(vx);
            if (HitWall)
            {
                Explode();
                return;
            }
            MoveY(Velocity.Y);
            if (OnGround) Velocity.Y = -3.5f;

            if (!IsOnScreen(8f) || Top > Map.HeightPx)
            {
                Removed = true;
                return;
            }

            var b = Bounds;
            foreach (var e in Stage.Entities)
            {
                if (e is Enemy enemy && enemy.IsActive && b.Intersects(enemy.Bounds))
                {
                    enemy.OnFireball(Math.Sign(vx));
                    Explode();
                    return;
                }
            }
        }

        void Explode()
        {
            Removed = true;
            Audio.Play("bump");
            Stage.Spawn(new Explosion(CenterX, CenterY));
        }

        public override void Draw(SpriteBatch sb)
        {
            _sheet.Draw(sb, (_anim / 3) % 4, Position, Velocity.X < 0);
        }
    }
}
