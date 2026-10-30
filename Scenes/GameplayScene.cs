using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;
using SuperDevStar.Entities;
using SuperDevStar.World;

namespace SuperDevStar.Scenes
{
    /// <summary>
    /// A fase em si: tempo, pontuacao, morte, canos, mastro e contagem final.
    /// </summary>
    public sealed class GameplayScene : Scene
    {
        enum State { Playing, Paused, Dying, Warping, Flag, Tally, Fireworks, Cleared }

        static readonly int[] StompPoints = { 100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000 };
        const int FramesPerTimeUnit = 24; // 1 unidade de tempo do SMB = 0.4s

        readonly Dictionary<string, Stage> _stages = new(StringComparer.OrdinalIgnoreCase);
        readonly Random _random = new();
        State _state = State.Playing;
        int _timer;
        int _timeTick;
        int _fireworks;
        int _timeAtFlag;
        bool _hurry;
        bool _timeUp;
        WarpData _warp;

        public LevelData Level { get; }
        public Player Player { get; private set; }
        public Stage Stage { get; private set; }
        public GameSession Session => Game.Session;
        public int Time { get; private set; }

        public GameplayScene(SuperDevStarGame game, LevelData level) : base(game)
        {
            Level = level;
        }

        public override void Enter()
        {
            Time = Level.Time;
            Player = new Player(Session.Character, Session.Power);
            Stage = GetStage(Level.StartArea);
            Player.Stage = Stage;

            var spawn = Stage.PlayerSpawn;
            if (Session.CheckpointReached && Stage.Checkpoint.HasValue) spawn = Stage.Checkpoint.Value;
            Player.PlaceAtTile(spawn.X, spawn.Y);
            Stage.Camera.CenterOn(Player.CenterX, Stage.Map.WidthPx);
            PlayAreaMusic();
        }

        Stage GetStage(string id)
        {
            if (_stages.TryGetValue(id, out var stage)) return stage;
            if (!Level.Areas.TryGetValue(id, out var data))
                throw new InvalidDataException($"Area '{id}' nao existe na fase {Level.Id}.");
            stage = new Stage(this, data);
            _stages[id] = stage;
            return stage;
        }

        void PlayAreaMusic()
        {
            Audio.PlayMusic(Player.Invincible ? "star" : Stage.Data.Music);
            if (_hurry) Audio.SetMusicPitch(0.2f);
        }

        // =====================================================================
        // Update
        // =====================================================================

        public override void Update()
        {
            if (_state == State.Paused)
            {
                if (Input.WasPressed(InputAction.Start))
                {
                    _state = State.Playing;
                    Audio.ResumeMusic();
                    Audio.Play("pause");
                }
                else if (Input.WasPressed(InputAction.Back))
                {
                    Audio.StopMusic();
                    Game.ChangeScene(new TitleScene(Game));
                }
                return;
            }

            if (_state == State.Warping)
            {
                UpdateWarp();
                return;
            }

            if (_state == State.Playing && (Input.WasPressed(InputAction.Start) || Input.WasPressed(InputAction.Back)))
            {
                _state = State.Paused;
                Audio.PauseMusic();
                Audio.Play("pause");
                return;
            }

            bool frozen = Player.Mode is PlayerMode.Growing or PlayerMode.Shrinking or PlayerMode.Dying;

            Player.PrevPosition = Player.Position;
            Player.Update();
            if (_state == State.Warping) return;

            Stage.Update(frozen);
            if (!frozen && Player.Mode == PlayerMode.Normal)
            {
                Stage.ResolvePlayerInteractions();
                CheckFlagpole();
                CheckCheckpoint();
            }
            if (Player.Mode != PlayerMode.Dying) Stage.Camera.Follow(Player.CenterX, Stage.Map.WidthPx);
            Stage.Cleanup();

            switch (_state)
            {
                case State.Playing:
                    UpdateTime();
                    break;
                case State.Dying:
                    if (Player.DeathFinished) OnLifeLost();
                    break;
                case State.Flag:
                    if (Player.Mode == PlayerMode.InCastle) _state = State.Tally;
                    break;
                case State.Tally:
                    UpdateTally();
                    break;
                case State.Fireworks:
                    UpdateFireworks();
                    break;
                case State.Cleared:
                    if (--_timer <= 0) GoToNextLevel();
                    break;
            }
        }

        void UpdateTime()
        {
            if (Player.Mode != PlayerMode.Normal) return;
            if (++_timeTick < FramesPerTimeUnit) return;
            _timeTick = 0;
            Time--;
            if (Time == 100 && !_hurry)
            {
                _hurry = true;
                Audio.Play("hurry");
                Audio.SetMusicPitch(0.2f);
            }
            if (Time <= 0)
            {
                Time = 0;
                _timeUp = true;
                KillPlayer(pit: false);
            }
        }

        void CheckCheckpoint()
        {
            if (Session.CheckpointReached || !Stage.Checkpoint.HasValue) return;
            if (!string.Equals(Stage.Data.Id, Level.StartArea, StringComparison.OrdinalIgnoreCase)) return;
            if (Player.CenterX >= Stage.Checkpoint.Value.X * 16) Session.CheckpointReached = true;
        }

        void CheckFlagpole()
        {
            var pole = Stage.Flagpole;
            if (pole == null || !pole.Touches(Player)) return;

            AddScore(pole.ScoreFor(Player), pole.PoleX + 12, Player.Top);
            _timeAtFlag = Time;
            Player.GrabFlag(pole);
            pole.Lowering = true;
            Audio.StopMusic();
            Audio.Play("flagpole");
            _state = State.Flag;
        }

        void UpdateTally()
        {
            if (Time > 0)
            {
                int step = Math.Min(Time, 2);
                Time -= step;
                Session.AddScore(50 * step);
                if (Time % 6 == 0) Audio.Play("tick");
                return;
            }
            int digit = _timeAtFlag % 10;
            _fireworks = digit is 1 or 3 or 6 ? digit : 0;
            _timer = 30;
            _state = State.Fireworks;
        }

        void UpdateFireworks()
        {
            if (--_timer > 0) return;
            if (_fireworks > 0)
            {
                _fireworks--;
                float baseX = Stage.CastleDoor.HasValue ? Stage.CastleDoor.Value.X * 16 + 8 : Stage.Camera.X + 200;
                float x = baseX + _random.Next(-48, 49);
                float y = 40 + _random.Next(0, 60);
                Stage.Spawn(new Explosion(x, y, firework: true));
                Audio.Play("firework");
                Session.AddScore(500);
                _timer = 30;
                return;
            }
            _state = State.Cleared;
            _timer = 150;
        }

        void GoToNextLevel()
        {
            Session.Power = Player.Power;
            Session.CheckpointReached = false;
            string next = LevelManager.Next(Level.Id);
            if (next != null)
            {
                Game.ChangeScene(new LevelIntroScene(Game, next));
            }
            else
            {
                SaveData.SubmitScore(Session.Score);
                Game.ChangeScene(new EndingScene(Game));
            }
        }

        void OnLifeLost()
        {
            Session.Lives--;
            Session.Power = PowerState.Small;
            if (Session.Lives <= 0)
            {
                SaveData.SubmitScore(Session.Score);
                Game.ChangeScene(new GameOverScene(Game));
            }
            else
            {
                Game.ChangeScene(new LevelIntroScene(Game, Level.Id, _timeUp));
            }
        }

        // ---------------- Canos ----------------

        public void BeginWarp(WarpData warp)
        {
            _warp = warp;
            _state = State.Warping;
            _timer = 40;
            Audio.StopMusic();
        }

        void UpdateWarp()
        {
            _timer--;
            if (_timer == 20)
            {
                Stage = GetStage(_warp.ToArea);
                Player.Stage = Stage;
                if (_warp.Exit == WarpExit.Rise) Player.BeginPipeExit(_warp.ToX, _warp.ToY);
                else Player.DropAt(_warp.ToX, _warp.ToY);
                Stage.Camera.X = 0;
                Stage.Camera.CenterOn(Player.CenterX, Stage.Map.WidthPx);
            }
            if (_timer <= 0)
            {
                _state = State.Playing;
                PlayAreaMusic();
            }
        }

        // =====================================================================
        // API usada pelas entidades
        // =====================================================================

        public void AddScore(int points, float x, float y, bool popup = true)
        {
            Session.AddScore(points);
            if (popup) Stage.Spawn(new ScorePopup(points.ToString(), x, y));
        }

        public void AwardStomp(Player p, float x, float y)
        {
            int i = p.StompCombo++;
            if (i < StompPoints.Length) AddScore(StompPoints[i], x, y);
            else GiveOneUp(x, y);
        }

        public void CollectCoin(float x, float y, bool popup)
        {
            Audio.Play("coin");
            Session.AddScore(200);
            if (Session.AddCoin()) Audio.Play("1up");
            if (popup) Stage.Spawn(new ScorePopup("200", x, y));
        }

        public void GiveOneUp(float x, float y)
        {
            Session.Lives++;
            Audio.Play("1up");
            Stage.Spawn(new ScorePopup("1UP", x, y));
        }

        public void KillPlayer(bool pit)
        {
            if (Player.Mode == PlayerMode.Dying) return;
            Player.StartDeath(pit);
            Audio.StopMusic();
            Audio.Play("die");
            _state = State.Dying;
        }

        public void OnStarCollected() => Audio.PlayMusic("star");

        public void OnStarEnded()
        {
            Audio.PlayMusic(Stage.Data.Music);
            if (_hurry) Audio.SetMusicPitch(0.2f);
        }

        public void OnPlayerLeftPole() => Audio.PlayMusic("stage_clear", loop: false);

        // =====================================================================
        // Draw
        // =====================================================================

        public override void Draw(SpriteBatch sb)
        {
            bool black = _state == State.Warping && _timer <= 32 && _timer > 8;
            if (!black) Stage.Draw(sb);

            Hud.Draw(sb, Session, Level.World, Time, Stage.FrameCounter);

            if (_state == State.Paused)
            {
                Gfx.Begin(sb);
                Gfx.Rect(sb, new Rectangle(0, 0, GameConstants.VirtualWidth, GameConstants.VirtualHeight), new Color(0, 0, 0, 140));
                PixelFont.DrawCentered(sb, "PAUSA", 128, 100, Color.White, 2, shadow: true);
                PixelFont.DrawCentered(sb, "ENTER - CONTINUAR", 128, 130, Color.White);
                PixelFont.DrawCentered(sb, "ESC - MENU PRINCIPAL", 128, 142, Color.White);
                sb.End();
            }
        }
    }
}
