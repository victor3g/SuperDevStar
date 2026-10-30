using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Characters;
using SuperDevStar.Core;
using SuperDevStar.Entities;
using SuperDevStar.World;

namespace SuperDevStar.Scenes
{
    /// <summary>
    /// Selecao de personagem. Mostra SelectSlots cartas (characters.json); as que nao tem
    /// personagem aparecem como "EM BREVE".
    /// </summary>
    public sealed class CharacterSelectScene : Scene
    {
        const int Columns = 4;
        const int CardSize = 52;
        const int CardGap = 8;

        readonly List<CharacterDefinition> _characters;
        Texture2D _background;
        int _cursor;
        int _frame;

        public CharacterSelectScene(SuperDevStarGame game) : base(game)
        {
            _characters = game.Characters.Characters;
        }

        int SlotCount => Math.Max(Game.Characters.SelectSlots, _characters.Count);

        CharacterDefinition At(int slot) => slot < _characters.Count ? _characters[slot] : null;

        public override void Enter()
        {
            foreach (var c in _characters) c.EnsureLoaded();
            _background = Assets.Texture("UI/select_background.png");
            Audio.PlayMusic("select");
        }

        public override void Update()
        {
            _frame++;
            int before = _cursor;
            if (Input.WasPressed(InputAction.Left)) _cursor = (_cursor + SlotCount - 1) % SlotCount;
            if (Input.WasPressed(InputAction.Right)) _cursor = (_cursor + 1) % SlotCount;
            if (Input.WasPressed(InputAction.Up) && _cursor - Columns >= 0) _cursor -= Columns;
            if (Input.WasPressed(InputAction.Down) && _cursor + Columns < SlotCount) _cursor += Columns;
            if (before != _cursor) Audio.Play("menu_move");

            if (Input.WasPressed(InputAction.Back))
            {
                Game.ChangeScene(new TitleScene(Game));
                return;
            }

            if (Input.WasPressed(InputAction.Confirm))
            {
                var c = At(_cursor);
                if (c == null || !c.Enabled)
                {
                    Audio.Play("bump");
                    return;
                }
                Audio.Play("menu_select");
                Game.Session = new GameSession(c);
                Game.ChangeScene(new LevelIntroScene(Game, LevelManager.First));
            }
        }

        public override void Draw(SpriteBatch sb)
        {
            int w = GameConstants.VirtualWidth, h = GameConstants.VirtualHeight;
            Gfx.Begin(sb);

            if (_background != null)
            {
                sb.Draw(_background, Vector2.Zero, Color.White);
            }
            else
            {
                // Fundo "terminal": azul escuro com grade.
                Gfx.Rect(sb, new Rectangle(0, 0, w, h), new Color(11, 16, 38));
                var grid = new Color(30, 50, 90);
                for (int x = 0; x < w; x += 16) Gfx.Rect(sb, new Rectangle(x, 0, 1, h), grid);
                for (int y = (_frame / 2) % 16; y < h; y += 16) Gfx.Rect(sb, new Rectangle(0, y, w, 1), grid);
            }

            // O select_background.png ja traz o titulo desenhado no topo.
            if (_background == null)
                PixelFont.DrawCentered(sb, "ESCOLHA SEU DEV", w / 2, 10, new Color(252, 216, 40), 2, shadow: true);

            int cols = Math.Min(Columns, SlotCount);
            int rows = (SlotCount + Columns - 1) / Columns;
            int totalW = cols * CardSize + (cols - 1) * CardGap;
            int startX = (w - totalW) / 2;
            int startY = 34;
            int rowH = rows > 1 ? CardSize + 4 : CardSize + 14;

            for (int i = 0; i < SlotCount; i++)
            {
                int cx = startX + (i % Columns) * (CardSize + CardGap);
                int cy = startY + (i / Columns) * rowH;
                DrawCard(sb, i, new Rectangle(cx, cy, CardSize, CardSize));
            }

            DrawInfoPanel(sb, new Rectangle(8, Math.Max(106, startY + rows * rowH + 4), w - 16, 0));

            PixelFont.DrawCentered(sb, "< > ESCOLHER   ENTER OK   ESC VOLTAR", w / 2, h - 12, Color.White);
            sb.End();
        }

        void DrawCard(SpriteBatch sb, int slot, Rectangle r)
        {
            var c = At(slot);
            bool selected = slot == _cursor;

            Gfx.Rect(sb, r, new Color(20, 28, 60));
            var inner = new Rectangle(r.X + 2, r.Y + 2, r.Width - 4, r.Height - 4);

            if (c == null)
            {
                Gfx.Rect(sb, inner, new Color(30, 30, 40));
                PixelFont.DrawCentered(sb, "?", inner.Center.X, inner.Y + 10, new Color(90, 90, 110), 3);
                PixelFont.DrawCentered(sb, "EM BREVE", inner.Center.X, inner.Bottom - 10, new Color(120, 120, 140));
            }
            else if (c.Portrait != null)
            {
                sb.Draw(c.Portrait, inner, Color.White);
            }
            else
            {
                Gfx.Rect(sb, inner, Gfx.Darken(c.PlaceholderColor, 0.4f));
                c.Small.Draw(sb, Player.FrameIdle, new Vector2(inner.Center.X - 16, inner.Y + 6), scale: 2f);
                string initials = c.Name.Length > 6 ? c.Name.Substring(0, 6) : c.Name;
                PixelFont.DrawCentered(sb, initials, inner.Center.X, inner.Bottom - 9, Color.White, 1, shadow: true);
            }

            var border = selected
                ? ((_frame / 8) % 2 == 0 ? new Color(252, 216, 40) : Color.White)
                : new Color(80, 90, 130);
            Gfx.Outline(sb, r, border, selected ? 2 : 1);
            if (selected) PixelFont.DrawCentered(sb, "V", r.Center.X, r.Y - 9 + (_frame / 10) % 2, new Color(252, 216, 40));
        }

        void DrawInfoPanel(SpriteBatch sb, Rectangle area)
        {
            var panel = new Rectangle(area.X, area.Y, area.Width, GameConstants.VirtualHeight - 20 - area.Y);
            Gfx.Rect(sb, panel, new Color(0, 0, 0, 170));
            Gfx.Outline(sb, panel, new Color(80, 90, 130));

            var c = At(_cursor);
            if (c == null)
            {
                PixelFont.DrawCentered(sb, "SLOT VAZIO", panel.Center.X, panel.Y + 20, new Color(150, 150, 170));
                PixelFont.DrawCentered(sb, "ADICIONE O PERSONAGEM EM", panel.Center.X, panel.Y + 40, new Color(150, 150, 170));
                PixelFont.DrawCentered(sb, "CHARACTERS.JSON", panel.Center.X, panel.Y + 52, new Color(150, 150, 170));
                return;
            }

            // Preview animado andando (versao grande).
            int walkFrame = Player.FrameWalk1 + (_frame / 6) % 3;
            // Celulas de 32 px tem o corpo no meio: puxa para a esquerda para nao sobrar espaco.
            var previewPos = new Vector2(panel.X + 12 - (c.Big.FrameWidth - 16), panel.Y + 12);
            c.Big.Draw(sb, walkFrame, previewPos, scale: 2f, placeholderHeight: 0);

            int textX = Math.Max(panel.X + 56, (int)previewPos.X + c.Big.FrameWidth * 2 + 6);
            int y = panel.Y + 8;
            PixelFont.Draw(sb, c.Name, textX, y, new Color(252, 216, 40), 1, shadow: true);
            y += 12;
            if (!string.IsNullOrWhiteSpace(c.Role)) { PixelFont.Draw(sb, c.Role, textX, y, Color.White); y += 10; }
            if (!string.IsNullOrWhiteSpace(c.Stack)) { PixelFont.Draw(sb, "STACK: " + c.Stack, textX, y, new Color(120, 220, 255)); y += 10; }
            y += 4;
            foreach (var line in PixelFont.Wrap(c.Description, panel.Right - textX - 6))
            {
                if (y > panel.Bottom - 10) break;
                PixelFont.Draw(sb, line, textX, y, new Color(200, 200, 210));
                y += 10;
            }
        }
    }
}
