using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;

namespace SuperDevStar.Scenes
{
    public sealed class TitleScene : Scene
    {
        static readonly string[] MenuItems = { "INICIAR JOGO", "CONTROLES", "SAIR" };

        static readonly string[] Controls =
        {
            "MOVER ............ SETAS / A D",
            "PULAR ............ Z / ESPACO",
            "CORRER / ATIRAR .. X / SHIFT",
            "AGACHAR / CANO ... SETA BAIXO",
            "PAUSA ............ ENTER",
            "TELA CHEIA ....... F11",
            "VER HITBOXES ..... F1",
            "",
            "CONTROLE: A PULA, X CORRE",
        };

        Texture2D _background;
        Texture2D _logo;
        int _cursor;
        int _frame;
        bool _showControls;

        public TitleScene(SuperDevStarGame game) : base(game) { }

        public override void Enter()
        {
            // Sem fundo proprio, usa o skyline da fase.
            _background = Assets.Texture("UI/title_background.png") ?? Assets.Texture("Backgrounds/overworld_far.png");
            _logo = Assets.Texture("UI/logo.png");
            Audio.PlayMusic("title");
        }

        public override void Update()
        {
            _frame++;
            if (_showControls)
            {
                if (Input.WasPressed(InputAction.Confirm) || Input.WasPressed(InputAction.Back)) _showControls = false;
                return;
            }

            if (Input.WasPressed(InputAction.Up))
            {
                _cursor = (_cursor + MenuItems.Length - 1) % MenuItems.Length;
                Audio.Play("menu_move");
            }
            if (Input.WasPressed(InputAction.Down))
            {
                _cursor = (_cursor + 1) % MenuItems.Length;
                Audio.Play("menu_move");
            }

            if (Input.WasPressed(InputAction.Confirm))
            {
                Audio.Play("menu_select");
                switch (_cursor)
                {
                    case 0: Game.ChangeScene(new CharacterSelectScene(Game)); break;
                    case 1: _showControls = true; break;
                    case 2: Game.Exit(); break;
                }
            }
        }

        public override void Draw(SpriteBatch sb)
        {
            Gfx.Begin(sb);
            int w = GameConstants.VirtualWidth, h = GameConstants.VirtualHeight;

            if (_background != null)
            {
                sb.Draw(_background, Vector2.Zero, new Rectangle(0, 0, w, h), Color.White);
            }
            else
            {
                Gfx.Rect(sb, new Rectangle(0, 0, w, h), new Color(92, 148, 252));
                Gfx.Rect(sb, new Rectangle(0, h - 32, w, 32), new Color(46, 139, 87));
                for (int x = 0; x < w; x += 16) Gfx.Outline(sb, new Rectangle(x, h - 32, 16, 16), new Color(30, 90, 56));
            }

            if (_logo != null)
            {
                sb.Draw(_logo, new Vector2((w - _logo.Width) / 2, 28), Color.White);
            }
            else
            {
                var panel = new Rectangle(24, 26, w - 48, 74);
                Gfx.Rect(sb, panel, new Color(200, 76, 12));
                Gfx.Outline(sb, panel, new Color(252, 216, 168), 2);
                PixelFont.DrawCentered(sb, "SUPER DEV", w / 2, 36, Color.White, 3, shadow: true);
                PixelFont.DrawCentered(sb, "STAR", w / 2, 64, new Color(252, 216, 40), 3, shadow: true);
            }

            if (_showControls)
            {
                var box = new Rectangle(12, 104, w - 24, 112);
                Gfx.Rect(sb, box, new Color(0, 0, 0, 200));
                Gfx.Outline(sb, box, Color.White);
                for (int i = 0; i < Controls.Length; i++)
                    PixelFont.Draw(sb, Controls[i], 22, 112 + i * 11, Color.White);
            }
            else
            {
                for (int i = 0; i < MenuItems.Length; i++)
                {
                    int y = 124 + i * 16;
                    PixelFont.Draw(sb, MenuItems[i], 88, y, Color.White, 1, shadow: true);
                    if (i == _cursor && (_frame / 16) % 2 == 0) PixelFont.Draw(sb, ">", 76, y, new Color(252, 216, 40), 1, shadow: true);
                }
                PixelFont.DrawCentered(sb, $"TOP- {SaveData.TopScore:D6}", w / 2, 184, Color.White, 1, shadow: true);
            }

            PixelFont.DrawCentered(sb, "© 2026 SUPER DEV STAR", w / 2, h - 12, Color.White, 1, shadow: true);
            sb.End();
        }
    }
}
