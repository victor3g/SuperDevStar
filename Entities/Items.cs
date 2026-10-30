using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.Entities
{
    /// <summary>Power-ups que saem dos blocos (sobem 16px por tras do bloco antes de ficarem ativos).</summary>
    public abstract class Item : Entity
    {
        protected const float Gravity = 0.3f;
        int _emerge;

        public bool Emerging => _emerge > 0;
        public override bool InteractsWithPlayer => !Emerging && !Removed;

        protected Item(float blockX, float blockY)
        {
            Width = 14f;
            Height = 16f;
            Position = new Vector2(blockX + 1f, blockY);
        }

        public void Emerge()
        {
            _emerge = 32;
            Layer = DrawLayer.BehindTiles;
            Audio.Play("powerup_appear");
        }

        public sealed override void Update()
        {
            if (_emerge > 0)
            {
                Position.Y -= 0.5f;
                if (--_emerge == 0)
                {
                    Layer = DrawLayer.Normal;
                    OnEmerged();
                }
                return;
            }
            if (Top > Map.HeightPx + 16 || Right < Stage.Camera.X - 64)
            {
                Removed = true;
                return;
            }
            UpdateItem();
        }

        protected virtual void OnEmerged() { }
        protected virtual void UpdateItem() { }

        /// <summary>Bloco atingido embaixo do item: ele pula e vai para longe do impacto.</summary>
        public virtual void Hop(float fromX)
        {
            if (Emerging) return;
            Velocity.Y = -3.5f;
            if ((CenterX < fromX && Velocity.X > 0) || (CenterX > fromX && Velocity.X < 0)) Velocity.X = -Velocity.X;
        }

        public override void OnTouchPlayer(Player p)
        {
            Removed = true;
            Collect(p);
        }

        protected abstract void Collect(Player p);

        protected void MoveLikeMushroom()
        {
            ApplyGravity(Gravity, 4f);
            float vx = Velocity.X;
            MoveX(vx);
            if (HitWall) Velocity.X = -vx;
            MoveY(Velocity.Y);
            if (OnGround) Velocity.Y = 0f;
        }

        protected void DrawSprite(SpriteBatch sb, SpriteSheet sheet, int frame)
        {
            sheet.Draw(sb, frame, new Vector2(CenterX - 8f, Bottom - 16f));
        }
    }

    /// <summary>CAFE - equivalente ao cogumelo. Junior vira Senior.</summary>
    public sealed class Coffee : Item
    {
        readonly SpriteSheet _sheet = Sprites.Get("Items/coffee.png", 16, 16, new Color(140, 80, 40));

        public Coffee(float x, float y) : base(x, y) { }

        protected override void OnEmerged() => Velocity.X = 1f;
        protected override void UpdateItem() => MoveLikeMushroom();

        protected override void Collect(Player p)
        {
            Stage.Scene.AddScore(1000, CenterX, Top);
            if (!p.IsBig) p.PowerUp(PowerState.Big);
            else Audio.Play("powerup");
        }

        public override void Draw(SpriteBatch sb) => DrawSprite(sb, _sheet, 0);
    }

    /// <summary>FIREWALL - equivalente a flor de fogo. Permite atirar pacotes de dados.</summary>
    public sealed class Firewall : Item
    {
        readonly SpriteSheet _sheet = Sprites.Get("Items/firewall.png", 16, 16, new Color(240, 100, 40));
        int _anim;

        public Firewall(float x, float y) : base(x, y) { }

        protected override void UpdateItem() => _anim++;

        public override void Hop(float fromX) { }

        protected override void Collect(Player p)
        {
            Stage.Scene.AddScore(1000, CenterX, Top);
            if (p.Power == PowerState.Small) p.PowerUp(PowerState.Big);
            else if (p.Power == PowerState.Big) p.PowerUp(PowerState.Fire);
            else Audio.Play("powerup");
        }

        public override void Draw(SpriteBatch sb) => DrawSprite(sb, _sheet, (_anim / 4) % 4);
    }

    /// <summary>SUDO STAR - equivalente a estrela. Invencibilidade temporaria.</summary>
    public sealed class SudoStar : Item
    {
        readonly SpriteSheet _sheet = Sprites.Get("Items/sudo_star.png", 16, 16, new Color(255, 230, 60));
        int _anim;

        public SudoStar(float x, float y) : base(x, y) { }

        protected override void OnEmerged() => Velocity = new Vector2(1f, -4f);

        protected override void UpdateItem()
        {
            _anim++;
            ApplyGravity(0.2f, 4f);
            float vx = Velocity.X;
            MoveX(vx);
            if (HitWall) Velocity.X = -vx;
            MoveY(Velocity.Y);
            if (OnGround) Velocity.Y = -4.5f;
            if (HitCeiling) Velocity.Y = 0f;
        }

        protected override void Collect(Player p)
        {
            Stage.Scene.AddScore(1000, CenterX, Top);
            p.GiveStar();
        }

        public override void Draw(SpriteBatch sb) => DrawSprite(sb, _sheet, (_anim / 3) % 4);
    }

    /// <summary>BACKUP (disquete) - equivalente ao cogumelo verde. Vida extra.</summary>
    public sealed class Backup : Item
    {
        readonly SpriteSheet _sheet = Sprites.Get("Items/backup.png", 16, 16, new Color(40, 200, 80));

        public Backup(float x, float y) : base(x, y) { }

        protected override void OnEmerged() => Velocity.X = 1f;
        protected override void UpdateItem() => MoveLikeMushroom();

        protected override void Collect(Player p) => Stage.Scene.GiveOneUp(CenterX, Top);

        public override void Draw(SpriteBatch sb) => DrawSprite(sb, _sheet, 0);
    }

    /// <summary>Moeda parada no cenario.</summary>
    public sealed class Coin : Entity
    {
        static readonly int[] Frames = { 0, 0, 0, 1, 2, 1 };
        readonly SpriteSheet _sheet = Sprites.Get("Items/coin.png", 16, 16, new Color(252, 200, 40));

        public Coin(float tileX, float tileY)
        {
            Width = 10f;
            Height = 14f;
            Position = new Vector2(tileX + 3f, tileY + 1f);
        }

        public override bool InteractsWithPlayer => !Removed;

        public override void OnTouchPlayer(Player p)
        {
            Removed = true;
            Stage.Scene.CollectCoin(CenterX, Top, popup: false);
        }

        public override void Draw(SpriteBatch sb)
        {
            int frame = Frames[(Stage.FrameCounter / 8) % Frames.Length];
            var pos = new Vector2(CenterX - 8f, CenterY - 8f);
            if (_sheet.IsPlaceholder)
                Gfx.Placeholder(sb, new Rectangle((int)Left, (int)Top, (int)Width, (int)Height), _sheet.Fallback);
            else
                _sheet.Draw(sb, frame, pos);
        }
    }
}
