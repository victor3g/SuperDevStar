using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Input;

namespace SuperDevStar.Core
{
    public enum InputAction { Left, Right, Up, Down, Jump, Run, Start, Confirm, Back }

    /// <summary>
    /// Teclado + controle. Mapeamento equivalente ao NES: Jump = A, Run = B (correr / atirar).
    /// </summary>
    public static class Input
    {
        static KeyboardState _kb, _prevKb;
        static GamePadState _pad, _prevPad;

        static readonly Dictionary<InputAction, Keys[]> KeyMap = new()
        {
            [InputAction.Left] = new[] { Keys.Left, Keys.A },
            [InputAction.Right] = new[] { Keys.Right, Keys.D },
            [InputAction.Up] = new[] { Keys.Up, Keys.W },
            [InputAction.Down] = new[] { Keys.Down, Keys.S },
            [InputAction.Jump] = new[] { Keys.Z, Keys.Space, Keys.K },
            [InputAction.Run] = new[] { Keys.X, Keys.LeftShift, Keys.J },
            [InputAction.Start] = new[] { Keys.Enter, Keys.P },
            [InputAction.Confirm] = new[] { Keys.Enter, Keys.Z, Keys.Space },
            [InputAction.Back] = new[] { Keys.Escape, Keys.Back },
        };

        static readonly Dictionary<InputAction, Buttons[]> PadMap = new()
        {
            [InputAction.Left] = new[] { Buttons.DPadLeft, Buttons.LeftThumbstickLeft },
            [InputAction.Right] = new[] { Buttons.DPadRight, Buttons.LeftThumbstickRight },
            [InputAction.Up] = new[] { Buttons.DPadUp, Buttons.LeftThumbstickUp },
            [InputAction.Down] = new[] { Buttons.DPadDown, Buttons.LeftThumbstickDown },
            [InputAction.Jump] = new[] { Buttons.A },
            [InputAction.Run] = new[] { Buttons.X, Buttons.Y },
            [InputAction.Start] = new[] { Buttons.Start },
            [InputAction.Confirm] = new[] { Buttons.A, Buttons.Start },
            [InputAction.Back] = new[] { Buttons.B, Buttons.Back },
        };

        public static void Update()
        {
            _prevKb = _kb;
            _prevPad = _pad;
            _kb = Keyboard.GetState();
            _pad = GamePad.GetState(PlayerIndex.One);
        }

        static bool Check(InputAction action, KeyboardState kb, GamePadState pad)
        {
            foreach (var k in KeyMap[action])
                if (kb.IsKeyDown(k)) return true;
            if (pad.IsConnected)
                foreach (var b in PadMap[action])
                    if (pad.IsButtonDown(b)) return true;
            return false;
        }

        public static bool IsDown(InputAction action) => Check(action, _kb, _pad);
        public static bool WasPressed(InputAction action) => Check(action, _kb, _pad) && !Check(action, _prevKb, _prevPad);

        public static bool KeyDown(Keys key) => _kb.IsKeyDown(key);
        public static bool KeyPressed(Keys key) => _kb.IsKeyDown(key) && !_prevKb.IsKeyDown(key);
    }
}
