using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;
using SuperDevStar.Entities;
using SuperDevStar.World;

namespace SuperDevStar.Scenes
{
    /// <summary>Tela preta "WORLD 1-1  x 3" antes da fase (e "TIME UP" se o tempo acabou).</summary>
    public sealed class LevelIntroScene : Scene
    {
        readonly string _levelId;
        bool _timeUp;
        int _timer;
        LevelData _level;
        string _error;

        public LevelIntroScene(SuperDevStarGame game, string levelId, bool timeUp = false) : base(game)
        {
            _levelId = levelId;
            _timeUp = timeUp;
        }

        public override void Enter()
        {
            Audio.StopMusic();
            _timer = _timeUp ? 240 : 150;
            try
            {
                _level = LevelManager.Load(_levelId);
            }
            catch (Exception ex)
            {
                _error = ex.Message;
                Console.WriteLine(ex);
            }
        }

        public override void Update()
        {
            if (_error != null)
            {
                if (Input.WasPressed(InputAction.Confirm) || Input.WasPressed(InputAction.Back))
                    Game.ChangeScene(new TitleScene(Game));
                return;
            }

            _timer--;
            if (_timeUp && _timer <= 150) _timeUp = false;
            if (_timer <= 0) Game.ChangeScene(new GameplayScene(Game, _level));
        }

        public override void Draw(SpriteBatch sb)
        {
            int w = GameConstants.VirtualWidth;
            Hud.Draw(sb, Game.Session, _level?.World ?? _levelId, null, 0);

            Gfx.Begin(sb);
            if (_error != null)
            {
                PixelFont.DrawCentered(sb, "ERRO AO CARREGAR A FASE", w / 2, 80, new Color(255, 90, 90));
                int y = 100;
                foreach (var line in PixelFont.Wrap(_error, w - 24))
                {
                    PixelFont.DrawCentered(sb, line, w / 2, y, Color.White);
                    y += 10;
                }
                PixelFont.DrawCentered(sb, "ENTER PARA VOLTAR", w / 2, 200, Color.White);
            }
            else if (_timeUp)
            {
                PixelFont.DrawCentered(sb, "TIME UP", w / 2, 110, Color.White, 2);
            }
            else
            {
                PixelFont.DrawCentered(sb, $"WORLD {_level.World}", w / 2, 80, Color.White, 1);
                PixelFont.DrawCentered(sb, _level.Name, w / 2, 94, new Color(120, 220, 255), 1);

                var session = Game.Session;
                var sheet = session.Power switch
                {
                    PowerState.Fire => session.Character.Fire,
                    PowerState.Big => session.Character.Big,
                    _ => session.Character.Small
                };
                sheet.Draw(sb, Player.FrameIdle, new Vector2(108 - sheet.FrameWidth / 2f, 136 - sheet.FrameHeight));
                PixelFont.Draw(sb, $"×  {session.Lives}", 126, 126, Color.White);
            }
            sb.End();
        }
    }
}
