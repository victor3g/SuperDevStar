using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Characters;
using SuperDevStar.Core;
using SuperDevStar.World;

namespace SuperDevStar.Entities
{
    /// <summary>Small = Junior, Big = Senior (tomou Cafe), Fire = com Firewall (atira pacotes).</summary>
    public enum PowerState { Small = 0, Big = 1, Fire = 2 }

    public enum PlayerMode
    {
        Normal,
        Growing,
        Shrinking,
        Dying,
        FlagSlide,
        FlagHold,
        WalkToCastle,
        InCastle,
        PipeEnter,
        PipeExit
    }

    /// <summary>
    /// O dev controlado pelo jogador. Fisica copiada dos valores do Super Mario Bros (NES),
    /// em pixels/frame a 60 FPS: aceleracao, derrapagem, pulo com altura variavel, etc.
    /// </summary>
    public sealed class Player : Entity
    {
        // ---------------- Frames do spritesheet (iguais para small/big/fire) ----------------
        public const int FrameIdle = 0;
        public const int FrameWalk1 = 1; // 1, 2, 3
        public const int FrameSkid = 4;
        public const int FrameJump = 5;
        public const int FrameCrouch = 6;
        public const int FrameDie = 7;
        public const int FrameClimb1 = 8;
        public const int FrameClimb2 = 9;
        public const int FrameThrow = 10;

        /// <summary>Ciclo de caminhada: passo, parado, passo, parado... (o quadro parado entre os passos da a sensacao de pisada).</summary>
        public static readonly int[] WalkCycle = { FrameWalk1, FrameIdle, FrameWalk1 + 1, FrameIdle, FrameWalk1 + 2, FrameIdle };

        // ---------------- Hitbox ----------------
        public const float PlayerWidth = 12f;
        public const float SmallHeight = 15f;
        public const float BigHeight = 27f;

        // ---------------- Fisica (SMB1) ----------------
        const float WalkAccel = 0.037109375f;
        const float RunAccel = 0.0556640625f;
        const float ReleaseDecel = 0.05078125f;
        const float SkidDecel = 0.1015625f;
        const float AirTurnDecel = 0.0556640625f;
        const float MaxWalk = 1.5625f;
        const float MaxRun = 2.5625f;
        const float MaxFall = 4.5f;
        const int RunHoldFrames = 10;

        public CharacterDefinition Character { get; }
        public PowerState Power { get; private set; }
        public PlayerMode Mode { get; private set; } = PlayerMode.Normal;
        public bool Crouching { get; private set; }
        public int Facing = 1;
        public int InvulnerableTimer;
        public int StarTimer;
        public int StompCombo;

        bool _jumping;
        bool _jumpPose;
        float _gravHold = 0.125f;
        float _gravFall = 0.4375f;
        int _runHold;
        int _throwTimer;
        int _frame;
        int _modeTimer;
        float _animDistance;
        int _walkStep;
        bool _wasWalking;
        bool _skidding;
        bool _deathByPit;
        PowerState _fromPower;
        PowerState _toPower;
        WarpData _warp;
        float _pipeGoal;
        Flagpole _pole;

        public Player(CharacterDefinition character, PowerState power)
        {
            Character = character;
            Character.EnsureLoaded();
            Power = power;
            Width = PlayerWidth;
            Height = power == PowerState.Small ? SmallHeight : BigHeight;
        }

        public bool IsBig => Power != PowerState.Small;
        public bool Invincible => StarTimer > 0;
        public bool CanBeHurt => Mode == PlayerMode.Normal && InvulnerableTimer == 0 && StarTimer == 0;
        public bool DeathFinished => Mode == PlayerMode.Dying && _modeTimer > 190;
        public bool BehindTiles => Mode is PlayerMode.PipeEnter or PlayerMode.PipeExit;
        public bool Hidden => Mode == PlayerMode.InCastle;

        protected override bool CanHitInvisibleBlocks => true;

        // =====================================================================
        // Posicionamento
        // =====================================================================

        /// <summary>Coloca o jogador em pe sobre o fundo do tile (tx, ty).</summary>
        public void PlaceAtTile(int tx, int ty)
        {
            Position = new Vector2(tx * 16 + (16 - Width) / 2f, (ty + 1) * 16 - Height);
            PrevPosition = Position;
            Velocity = Vector2.Zero;
            Mode = PlayerMode.Normal;
            Facing = 1;
        }

        public void DropAt(int tx, int ty)
        {
            Position = new Vector2(tx * 16 + (16 - Width) / 2f, ty * 16);
            PrevPosition = Position;
            Velocity = Vector2.Zero;
            Mode = PlayerMode.Normal;
        }

        public void BeginPipeExit(int pipeTx, int pipeTy)
        {
            Position = new Vector2(pipeTx * 16 + 16 - Width / 2f, pipeTy * 16);
            PrevPosition = Position;
            Velocity = Vector2.Zero;
            _pipeGoal = pipeTy * 16 - Height;
            Mode = PlayerMode.PipeExit;
            _frame = FrameIdle;
            Audio.Play("pipe");
        }

        void SetHeight(float h)
        {
            Position.Y += Height - h;
            Height = h;
        }

        // =====================================================================
        // Update
        // =====================================================================

        public override void Update()
        {
            switch (Mode)
            {
                case PlayerMode.Normal: UpdateNormal(); break;
                case PlayerMode.Growing:
                case PlayerMode.Shrinking:
                    if (--_modeTimer <= 0) Mode = PlayerMode.Normal;
                    break;
                case PlayerMode.Dying: UpdateDying(); break;
                case PlayerMode.FlagSlide: UpdateFlagSlide(); break;
                case PlayerMode.FlagHold: UpdateFlagHold(); break;
                case PlayerMode.WalkToCastle: UpdateWalkToCastle(); break;
                case PlayerMode.PipeEnter: UpdatePipeEnter(); break;
                case PlayerMode.PipeExit: UpdatePipeExit(); break;
            }
        }

        void UpdateNormal()
        {
            if (InvulnerableTimer > 0) InvulnerableTimer--;
            if (StarTimer > 0 && --StarTimer == 0) Stage.Scene.OnStarEnded();
            if (_throwTimer > 0) _throwTimer--;

            bool left = Input.IsDown(InputAction.Left);
            bool right = Input.IsDown(InputAction.Right);
            bool down = Input.IsDown(InputAction.Down);
            bool jumpHeld = Input.IsDown(InputAction.Jump);
            bool jumpPressed = Input.WasPressed(InputAction.Jump);
            bool runHeld = Input.IsDown(InputAction.Run);
            bool runPressed = Input.WasPressed(InputAction.Run);

            // ---- Agachar (so grande, so no chao) ----
            if (IsBig && OnGround)
            {
                if (down && !Crouching) StartCrouch();
                else if (!down && Crouching) TryStand();
            }
            else if (!IsBig && Crouching)
            {
                Crouching = false;
            }

            int dir = (right ? 1 : 0) - (left ? 1 : 0);
            if (Crouching && OnGround) dir = 0;

            // ---- Correr: o "B" continua valendo alguns frames apos soltar ----
            _runHold = runHeld ? RunHoldFrames : Math.Max(0, _runHold - 1);
            bool running = _runHold > 0;
            float max = running ? MaxRun : MaxWalk;

            // ---- Movimento horizontal ----
            _skidding = false;
            float vx = Velocity.X;
            if (dir != 0)
            {
                if (OnGround) Facing = dir;
                if (vx != 0f && Math.Sign(vx) != dir)
                {
                    vx += dir * (OnGround ? SkidDecel : AirTurnDecel);
                    _skidding = OnGround && Math.Sign(vx) != dir && vx != 0f;
                }
                else if (Math.Abs(vx) < max)
                {
                    vx += dir * (running ? RunAccel : WalkAccel);
                    if (Math.Abs(vx) > max) vx = dir * max;
                }
                else if (OnGround)
                {
                    // Soltou o botao de correr acima da velocidade de caminhada: desacelera ate o limite.
                    vx -= Math.Sign(vx) * ReleaseDecel;
                    if (Math.Abs(vx) < max) vx = Math.Sign(vx) * max;
                }
            }
            else if (OnGround)
            {
                float decel = ReleaseDecel;
                vx = Math.Abs(vx) <= decel ? 0f : vx - Math.Sign(vx) * decel;
            }
            Velocity.X = vx;

            // ---- Pulo (altura depende da velocidade horizontal, como no SMB) ----
            if (jumpPressed && OnGround)
            {
                float speed = Math.Abs(Velocity.X);
                if (speed < 1f) { Velocity.Y = -4f; _gravHold = 0.125f; _gravFall = 0.4375f; }
                else if (speed < 2.3125f) { Velocity.Y = -4f; _gravHold = 0.1171875f; _gravFall = 0.375f; }
                else { Velocity.Y = -5f; _gravHold = 0.15625f; _gravFall = 0.5625f; }
                _jumping = true;
                _jumpPose = true;
                OnGround = false;
                Audio.Play(IsBig ? "jump_big" : "jump_small");
            }
            if (!jumpHeld) _jumping = false;

            float gravity = _jumping && Velocity.Y < 0f ? _gravHold : _gravFall;
            ApplyGravity(gravity, MaxFall);

            // ---- Atirar pacote (Firewall) ----
            if (runPressed && Power == PowerState.Fire && !Crouching) TryThrow();

            // ---- Colisao com o mapa ----
            MoveX(Velocity.X);
            if (HitWall) Velocity.X = 0f;

            float camLeft = Stage.Camera.X;
            if (Position.X < camLeft)
            {
                Position.X = camLeft;
                if (Velocity.X < 0) Velocity.X = 0f;
            }

            MoveY(Velocity.Y);
            if (OnGround)
            {
                Velocity.Y = 0f;
                _jumping = false;
                _jumpPose = false;
                StompCombo = 0;
                _gravFall = 0.4375f;
            }
            if (HitCeiling && Velocity.Y < 0f)
            {
                Velocity.Y = 0f;
                _jumping = false;
            }

            if (OnGround) CheckWarps(down, right);
            if (Mode != PlayerMode.Normal) return;

            if (Top > Map.HeightPx + 8) Stage.Scene.KillPlayer(pit: true);

            Animate();
        }

        void StartCrouch()
        {
            Crouching = true;
            SetHeight(SmallHeight);
        }

        void TryStand()
        {
            // So levanta se houver espaco acima.
            float newTop = Bottom - BigHeight;
            int ty = (int)MathF.Floor(newTop / 16f);
            int l = (int)MathF.Floor(Left / 16f), r = (int)MathF.Floor((Right - Eps) / 16f);
            for (int tx = l; tx <= r; tx++)
                if (Map.IsSolid(tx, ty)) return;
            Crouching = false;
            SetHeight(BigHeight);
        }

        void TryThrow()
        {
            if (Stage.Count<PacketProjectile>() >= 2) return;
            Stage.Spawn(new PacketProjectile(this));
            _throwTimer = 8;
            Audio.Play("fireball");
        }

        protected override void OnHeadBump(int tx, int ty)
        {
            Stage.HitBlock(tx, ty, this);
        }

        void Animate()
        {
            bool walking = OnGround && !Crouching && !_skidding && Math.Abs(Velocity.X) > 0.01f;
            if (!walking) _wasWalking = false;

            if (Crouching)
            {
                _frame = FrameCrouch;
            }
            else if (!OnGround)
            {
                if (_jumpPose) _frame = FrameJump;
            }
            else if (_skidding)
            {
                _frame = FrameSkid;
            }
            else if (walking)
            {
                AnimateWalk(Velocity.X);
            }
            else
            {
                _frame = FrameIdle;
            }

            if (_throwTimer > 0 && !Crouching) _frame = FrameThrow;
        }

        /// <summary>Avanca o ciclo de caminhada conforme a distancia percorrida (mais rapido = passos mais rapidos).</summary>
        void AnimateWalk(float vx)
        {
            if (!_wasWalking)
            {
                // comeca sempre com um passo, para a reacao ao botao ser imediata
                _wasWalking = true;
                _walkStep = 0;
                _animDistance = 0f;
            }
            _animDistance += Math.Max(Math.Abs(vx), 0.6f);
            if (_animDistance >= 6f)
            {
                _animDistance -= 6f;
                _walkStep = (_walkStep + 1) % WalkCycle.Length;
            }
            _frame = WalkCycle[_walkStep];
        }

        // =====================================================================
        // Poderes e dano
        // =====================================================================

        public void PowerUp(PowerState target)
        {
            if (target <= Power) return;
            _fromPower = Power;
            _toPower = target;
            if (Power == PowerState.Small)
            {
                SetHeight(BigHeight);
                Crouching = false;
            }
            Power = target;
            Mode = PlayerMode.Growing;
            _modeTimer = 48;
            Audio.Play("powerup");
        }

        public void Hurt()
        {
            if (!CanBeHurt) return;
            if (Power == PowerState.Small)
            {
                Stage.Scene.KillPlayer(pit: false);
                return;
            }
            _fromPower = Power;
            _toPower = PowerState.Small;
            Power = PowerState.Small;
            Crouching = false;
            SetHeight(SmallHeight);
            Mode = PlayerMode.Shrinking;
            _modeTimer = 48;
            InvulnerableTimer = 120;
            Audio.Play("pipe");
        }

        public void GiveStar()
        {
            StarTimer = 660;
            Stage.Scene.OnStarCollected();
        }

        /// <summary>Quique ao pisar num inimigo. Segurar pulo deixa o quique mais alto.</summary>
        public void Bounce()
        {
            Velocity.Y = -4f;
            _jumping = true;
            _jumpPose = true;
            _gravHold = 0.125f;
            _gravFall = 0.4375f;
        }

        public void StartDeath(bool pit)
        {
            Mode = PlayerMode.Dying;
            _deathByPit = pit;
            _modeTimer = 0;
            Velocity = Vector2.Zero;
            StarTimer = 0;
            InvulnerableTimer = 0;
            if (Power != PowerState.Small)
            {
                Power = PowerState.Small;
                SetHeight(SmallHeight);
            }
            Crouching = false;
            _frame = FrameDie;
            Layer = DrawLayer.Front;
        }

        void UpdateDying()
        {
            _modeTimer++;
            if (_deathByPit) return;
            if (_modeTimer == 30) Velocity.Y = -5f;
            if (_modeTimer > 30)
            {
                Velocity.Y = Math.Min(Velocity.Y + 0.25f, 5f);
                Position.Y += Velocity.Y;
            }
        }

        // =====================================================================
        // Mastro / fim de fase
        // =====================================================================

        public void GrabFlag(Flagpole pole)
        {
            _pole = pole;
            Mode = PlayerMode.FlagSlide;
            Velocity = Vector2.Zero;
            StarTimer = 0;
            Crouching = false;
            if (IsBig && Height != BigHeight) SetHeight(BigHeight);
            Position.X = pole.PoleX - Width + 3f;
            Facing = 1;
            _modeTimer = 0;
            _frame = FrameClimb1;
        }

        void UpdateFlagSlide()
        {
            _modeTimer++;
            if (Bottom < _pole.BottomY)
            {
                Position.Y = Math.Min(Position.Y + 2f, _pole.BottomY - Height);
                _frame = (_modeTimer / 4) % 2 == 0 ? FrameClimb1 : FrameClimb2;
            }
            else
            {
                _frame = FrameClimb1;
            }

            if (Bottom >= _pole.BottomY - Eps && _pole.FlagDown)
            {
                Mode = PlayerMode.FlagHold;
                Position.X = _pole.PoleX - 3f;
                Facing = -1;
                _modeTimer = 24;
            }
        }

        void UpdateFlagHold()
        {
            if (--_modeTimer > 0) return;
            Mode = PlayerMode.WalkToCastle;
            Facing = 1;
            Stage.Scene.OnPlayerLeftPole();
        }

        void UpdateWalkToCastle()
        {
            Velocity.X = 1.25f;
            Facing = 1;
            ApplyGravity(0.4375f, MaxFall);
            MoveX(Velocity.X);
            MoveY(Velocity.Y);
            if (OnGround) Velocity.Y = 0f;
            if (OnGround) AnimateWalk(Velocity.X);
            else _frame = FrameJump;

            float door = Stage.CastleDoor.HasValue ? Stage.CastleDoor.Value.X * 16 + 8 : _pole.PoleX + 6 * 16;
            if (CenterX >= door || HitWall) Mode = PlayerMode.InCastle;
        }

        // =====================================================================
        // Canos / dutos
        // =====================================================================

        void CheckWarps(bool down, bool right)
        {
            foreach (var w in Stage.Scene.Level.Warps)
            {
                if (!string.Equals(w.FromArea, Stage.Data.Id, StringComparison.OrdinalIgnoreCase)) continue;

                if (w.Direction == WarpDirection.Down && down)
                {
                    float pipeLeft = w.FromX * 16f;
                    bool onTop = Math.Abs(Bottom - w.FromY * 16f) < 1f;
                    bool centered = CenterX >= pipeLeft + 4f && CenterX <= pipeLeft + 28f;
                    if (onTop && centered) { StartPipeEnter(w); return; }
                }
                else if (w.Direction == WarpDirection.Right && right)
                {
                    float mouthX = w.FromX * 16f;
                    bool touching = Math.Abs(Right - mouthX) < 1f;
                    bool inside = Bottom > w.FromY * 16f && Bottom <= (w.FromY + 2) * 16f + 0.5f;
                    if (touching && inside) { StartPipeEnter(w); return; }
                }
            }
        }

        void StartPipeEnter(WarpData w)
        {
            _warp = w;
            Mode = PlayerMode.PipeEnter;
            Velocity = Vector2.Zero;
            if (Crouching) TryStand();
            Audio.Play("pipe");
            if (w.Direction == WarpDirection.Down)
            {
                Position.X = w.FromX * 16 + 16 - Width / 2f;
                _pipeGoal = Position.Y + Height + 2f;
                _frame = FrameIdle;
            }
            else
            {
                Facing = 1;
                _pipeGoal = Position.X + Width + 2f;
            }
        }

        void UpdatePipeEnter()
        {
            if (_warp == null) return;
            if (_warp.Direction == WarpDirection.Down)
            {
                Position.Y += 1f;
                if (Position.Y < _pipeGoal) return;
            }
            else
            {
                Position.X += 1f;
                AnimateWalk(1f);
                if (Position.X < _pipeGoal) return;
            }
            var warp = _warp;
            _warp = null;
            Stage.Scene.BeginWarp(warp);
        }

        void UpdatePipeExit()
        {
            Position.Y -= 1f;
            if (Position.Y > _pipeGoal) return;
            Position.Y = _pipeGoal;
            Mode = PlayerMode.Normal;
            OnGround = true;
        }

        // =====================================================================
        // Desenho
        // =====================================================================

        static readonly Color[] StarColors =
        {
            Color.White, new Color(255, 170, 170), new Color(170, 255, 170), new Color(170, 200, 255)
        };

        public override void Draw(SpriteBatch sb)
        {
            if (Hidden) return;
            if (Mode == PlayerMode.Dying && _deathByPit) return;
            if (InvulnerableTimer > 0 && Mode == PlayerMode.Normal && (InvulnerableTimer / 2) % 2 == 0) return;

            PowerState drawPower = Power;
            if (Mode is PlayerMode.Growing or PlayerMode.Shrinking)
                drawPower = (_modeTimer / 4) % 2 == 0 ? _toPower : _fromPower;

            var sheet = drawPower switch
            {
                PowerState.Fire => Character.Fire,
                PowerState.Big => Character.Big,
                _ => Character.Small
            };

            int frame = _frame;
            if (Mode is PlayerMode.Growing or PlayerMode.Shrinking) frame = FrameIdle;
            if (drawPower == PowerState.Small && frame == FrameCrouch) frame = FrameIdle;

            Color tint = Color.White;
            if (drawPower == PowerState.Fire && Character.FireIsFallback && !sheet.IsPlaceholder) tint = new Color(255, 200, 150);
            if (StarTimer > 0)
            {
                int speed = StarTimer < 120 ? 8 : 2;
                tint = StarColors[(StarTimer / speed) % StarColors.Length];
            }

            int placeholderHeight = drawPower != PowerState.Small && Crouching ? 18 : 0;
            var pos = new Vector2(CenterX - sheet.FrameWidth / 2f, Bottom - sheet.FrameHeight);
            sheet.Draw(sb, frame, pos, Facing < 0, tint, false, placeholderHeight);
        }

        public override void DrawDebug(SpriteBatch sb) => Gfx.Outline(sb, Bounds.ToRectangle(), Color.Yellow);
    }
}
