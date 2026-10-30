using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.Scenes
{
    public sealed class GameOverScene : Scene
    {
        int _timer = 300;

        public GameOverScene(SuperDevStarGame game) : base(game) { }

        public override void Enter()
        {
            Audio.StopMusic();
            Audio.Play("game_over");
        }

        public override void Update()
        {
            if (--_timer <= 0 || (_timer < 240 && Input.WasPressed(InputAction.Confirm)))
                Game.ChangeScene(new TitleScene(Game));
        }

        public override void Draw(SpriteBatch sb)
        {
            Hud.Draw(sb, Game.Session, "-", null, 0);
            Gfx.Begin(sb);
            PixelFont.DrawCentered(sb, "GAME OVER", GameConstants.VirtualWidth / 2, 104, Color.White, 2);
            PixelFont.DrawCentered(sb, "SEGMENTATION FAULT (CORE DUMPED)", GameConstants.VirtualWidth / 2, 132, new Color(255, 90, 90));
            sb.End();
        }
    }

    /// <summary>Tela exibida quando a ultima fase de levels.txt e concluida.</summary>
    public sealed class EndingScene : Scene
    {
        int _frame;

        public EndingScene(SuperDevStarGame game) : base(game) { }

        public override void Enter() => Audio.PlayMusic("ending");

        public override void Update()
        {
            _frame++;
            if (_frame > 120 && Input.WasPressed(InputAction.Confirm))
            {
                Audio.StopMusic();
                Game.ChangeScene(new TitleScene(Game));
            }
        }

        public override void Draw(SpriteBatch sb)
        {
            int w = GameConstants.VirtualWidth;
            var s = Game.Session;
            Hud.Draw(sb, s, "-", null, _frame);
            Gfx.Begin(sb);
            PixelFont.DrawCentered(sb, "DEPLOY EM PRODUCAO", w / 2, 60, new Color(120, 255, 140), 2, shadow: true);
            PixelFont.DrawCentered(sb, "CONCLUIDO!", w / 2, 82, new Color(120, 255, 140), 2, shadow: true);
            PixelFont.DrawCentered(sb, $"OBRIGADO, {s.Character.Name}!", w / 2, 120, Color.White);
            PixelFont.DrawCentered(sb, "TODOS OS BUGS FORAM CORRIGIDOS.", w / 2, 134, Color.White);
            PixelFont.DrawCentered(sb, "(ATE A PROXIMA SPRINT...)", w / 2, 146, new Color(170, 170, 190));
            PixelFont.DrawCentered(sb, $"PONTOS  {s.Score:D6}", w / 2, 172, new Color(252, 216, 40));
            if (_frame > 120 && (_frame / 20) % 2 == 0)
                PixelFont.DrawCentered(sb, "PRESSIONE ENTER", w / 2, 204, Color.White);
            sb.End();
        }
    }
}
