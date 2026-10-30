using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.Entities
{
    /// <summary>
    /// Base dos inimigos. Ficam "dormindo" ate entrarem na tela pela direita (como no SMB).
    /// Sprites de inimigos olham para a ESQUERDA por padrao.
    /// </summary>
    public abstract class Enemy : Entity
    {
        protected const float Gravity = 0.375f;
        protected const float MaxFall = 4f;

        public bool Dormant = true;
        public bool Dead { get; protected set; }
        public float WalkSpeed = 0.5f;
        protected bool FlippedDeath;

        public bool IsActive => !Dead && !Dormant && !Removed;
        public virtual bool IsMovingShell => false;
        public override bool InteractsWithPlayer => IsActive;

        public override void Update()
        {
            if (Dormant)
            {
                if (Left > Stage.Camera.X + Stage.Camera.Width + 8) return;
                Dormant = false;
            }

            if (FlippedDeath)
            {
                Velocity.Y = Math.Min(Velocity.Y + Gravity, 6f);
                Position += Velocity;
                if (Top > Map.HeightPx + 16) Removed = true;
                return;
            }

            if (Right < Stage.Camera.X - 96 || Top > Map.HeightPx + 16)
            {
                Removed = true;
                return;
            }

            UpdateAlive();
        }

        protected abstract void UpdateAlive();

        protected void WalkAndCollide()
        {
            ApplyGravity(Gravity, MaxFall);
            float vx = Velocity.X;
            MoveX(vx);
            if (HitWall) Velocity.X = -vx;
            MoveY(Velocity.Y);
            if (OnGround) Velocity.Y = 0f;
        }

        /// <summary>Muda a altura da hitbox mantendo os pes no mesmo lugar.</summary>
        protected void SetHeight(float h)
        {
            Position.Y += Height - h;
            Height = h;
        }

        /// <summary>Morte "de costas" caindo para fora da tela (casco, pacote, estrela, bloco).</summary>
        public void KillFlipped(float dir, int points)
        {
            if (FlippedDeath) return;
            Dead = true;
            FlippedDeath = true;
            Velocity = new Vector2((dir == 0 ? 1 : Math.Sign(dir)) * 0.75f, -3.5f);
            Layer = DrawLayer.Front;
            Audio.Play("kick");
            if (points > 0) Stage.Scene.AddScore(points, CenterX, Top);
        }

        /// <summary>O jogador esta caindo e veio de cima.</summary>
        protected bool IsStompedBy(Player p) =>
            p.Position.Y > p.PrevPosition.Y && p.PrevBottom <= Top + 6f;

        public override void OnTouchPlayer(Player p)
        {
            if (p.Invincible)
            {
                KillFlipped(CenterX >= p.CenterX ? 1 : -1, 200);
                return;
            }
            if (IsStompedBy(p)) OnStomped(p);
            else p.Hurt();
        }

        protected abstract void OnStomped(Player p);

        public virtual void OnBumpedFromBelow(float fromX) => KillFlipped(CenterX >= fromX ? 1 : -1, 100);

        public virtual void OnFireball(float dir) => KillFlipped(dir, 200);
    }

    /// <summary>BUG - equivalente ao Goomba. Anda, cai de beiradas, morre esmagado.</summary>
    public sealed class Bug : Enemy
    {
        readonly SpriteSheet _sheet;
        int _anim;
        int _squash;

        public Bug(float tileX, float tileY, string theme)
        {
            // Hitbox do tamanho visivel do sprite (16x12 dentro do quadro de 16x16).
            Width = 14f;
            Height = 12f;
            Position = new Vector2(tileX + 1f, tileY + 16f - Height);
            Velocity.X = -WalkSpeed;
            _sheet = Sprites.Themed("Enemies", "bug", theme, 16, 16, new Color(196, 64, 48));
            _sheet.PlaceholderEye = true;
        }

        public override void Update()
        {
            if (_squash > 0)
            {
                if (--_squash == 0) Removed = true;
                return;
            }
            base.Update();
        }

        protected override void UpdateAlive()
        {
            WalkAndCollide();
            _anim++;
        }

        protected override void OnStomped(Player p)
        {
            Dead = true;
            _squash = 30;
            Velocity = Vector2.Zero;
            Audio.Play("stomp");
            p.Bounce();
            Stage.Scene.AwardStomp(p, CenterX, Top);
        }

        public override void Draw(SpriteBatch sb)
        {
            var pos = new Vector2(CenterX - 8f, Bottom - 16f);
            if (_squash > 0)
            {
                _sheet.Draw(sb, 2, pos, placeholderHeight: 8);
                return;
            }

            int frame = 0;
            bool flip = false;
            if (_sheet.FrameCount >= 2) frame = (_anim / 8) % 2;
            else flip = (_anim / 8) % 2 == 1; // so 1 frame: espelha para "andar"
            _sheet.Draw(sb, frame, pos, flip, null, FlippedDeath);
        }
    }

    /// <summary>
    /// VIRUS - equivalente ao Koopa. Pisado vira "capsula" (casco); a capsula pode ser chutada
    /// e destroi outros inimigos.
    /// </summary>
    public sealed class Virus : Enemy
    {
        enum State { Walking, Shell, ShellMoving }

        static readonly int[] ShellCombo = { 500, 800, 1000, 2000, 4000, 5000, 8000 };
        const float ShellSpeed = 3f;
        const float WalkHeight = 14f;
        const float ShellHeight = 9f; // a capsula e baixinha (16x8)

        readonly SpriteSheet _walk;
        readonly SpriteSheet _shell;
        State _state = State.Walking;
        int _anim;
        int _wakeTimer;
        int _kickGrace;
        int _shellCombo;

        public override bool IsMovingShell => _state == State.ShellMoving && !Dead;

        public Virus(float tileX, float tileY, string theme)
        {
            Width = 14f;
            Height = WalkHeight;
            Position = new Vector2(tileX + 1f, tileY + 16f - Height);
            Velocity.X = -WalkSpeed;
            _walk =Sprites.Themed("Enemies", "virus", theme, 16, 24, new Color(64, 176, 72));
            _walk.PlaceholderEye = true;
            _shell = Sprites.Themed("Enemies", "virus_shell", theme, 16, 16, new Color(48, 140, 56));
        }

        protected override void UpdateAlive()
        {
            _anim++;
            if (_kickGrace > 0) _kickGrace--;

            switch (_state)
            {
                case State.Walking:
                    WalkAndCollide();
                    break;

                case State.Shell:
                    Velocity.X = 0f;
                    WalkAndCollide();
                    if (--_wakeTimer <= 0)
                    {
                        _state = State.Walking;
                        SetHeight(WalkHeight);
                        Velocity.X = (Stage.Player.CenterX < CenterX ? -1 : 1) * WalkSpeed;
                    }
                    break;

                case State.ShellMoving:
                    WalkAndCollide();
                    if (HitWall && IsOnScreen()) Audio.Play("bump");
                    break;
            }
        }

        public override void OnTouchPlayer(Player p)
        {
            if (p.Invincible)
            {
                KillFlipped(CenterX >= p.CenterX ? 1 : -1, 200);
                return;
            }

            bool stomp = IsStompedBy(p);
            switch (_state)
            {
                case State.Walking:
                    if (stomp) OnStomped(p);
                    else p.Hurt();
                    break;

                case State.Shell:
                    Kick(p.CenterX < CenterX ? 1 : -1);
                    if (stomp) p.Bounce();
                    Stage.Scene.AddScore(400, CenterX, Top);
                    break;

                case State.ShellMoving:
                    if (stomp)
                    {
                        EnterShell();
                        p.Bounce();
                        Audio.Play("stomp");
                        Stage.Scene.AwardStomp(p, CenterX, Top);
                    }
                    else if (_kickGrace == 0)
                    {
                        p.Hurt();
                    }
                    break;
            }
        }

        protected override void OnStomped(Player p)
        {
            EnterShell();
            Audio.Play("stomp");
            p.Bounce();
            Stage.Scene.AwardStomp(p, CenterX, Top);
        }

        void EnterShell()
        {
            _state = State.Shell;
            _wakeTimer = 300;
            Velocity.X = 0f;
            SetHeight(ShellHeight);
        }

        void Kick(int dir)
        {
            _state = State.ShellMoving;
            Velocity.X = dir * ShellSpeed;
            _kickGrace = 10;
            _shellCombo = 0;
            Audio.Play("kick");
        }

        /// <summary>Pontos pelo proximo inimigo atingido pela capsula. -1 = vida extra.</summary>
        public int NextShellComboPoints()
        {
            int i = _shellCombo++;
            return i < ShellCombo.Length ? ShellCombo[i] : -1;
        }

        public override void Draw(SpriteBatch sb)
        {
            if (_state == State.Walking && !FlippedDeath)
            {
                var pos = new Vector2(CenterX - 8f, Bottom - 24f);
                _walk.Draw(sb, (_anim / 8) % 2, pos, Velocity.X > 0, null, false);
                return;
            }

            int frame = 0;
            if (_state == State.Shell && _wakeTimer < 80 && (_anim / 4) % 2 == 0) frame = 1;
            _shell.Draw(sb, frame, new Vector2(CenterX - 8f, Bottom - 16f), false, null, FlippedDeath);
        }
    }
}
