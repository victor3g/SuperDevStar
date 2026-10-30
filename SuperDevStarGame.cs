using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;
using SuperDevStar.Characters;
using SuperDevStar.Core;
using SuperDevStar.Scenes;

namespace SuperDevStar
{
    /// <summary>
    /// Classe principal do jogo. Renderiza tudo numa resolucao virtual (estilo NES, 256x240)
    /// e escala para a janela mantendo os pixels nitidos.
    /// </summary>
    public sealed class SuperDevStarGame : Game
    {
        readonly GraphicsDeviceManager _graphics;
        SpriteBatch _spriteBatch;
        RenderTarget2D _target;
        Scene _scene;
        Scene _pendingScene;

        public GameSession Session { get; set; }
        public CharacterRegistry Characters { get; private set; }
        public static bool DebugHitboxes { get; private set; }

        public SuperDevStarGame()
        {
            _graphics = new GraphicsDeviceManager(this)
            {
                PreferredBackBufferWidth = GameConstants.VirtualWidth * GameConstants.WindowScale,
                PreferredBackBufferHeight = GameConstants.VirtualHeight * GameConstants.WindowScale,
                SynchronizeWithVerticalRetrace = true
            };
            // Toda a fisica e calculada por frame (60 FPS fixos), igual ao jogo original.
            IsFixedTimeStep = true;
            TargetElapsedTime = TimeSpan.FromSeconds(1.0 / 60.0);
            IsMouseVisible = false;
            Window.Title = "Super Dev Star";
            Window.AllowUserResizing = true;
        }

        protected override void LoadContent()
        {
            _spriteBatch = new SpriteBatch(GraphicsDevice);
            _target = new RenderTarget2D(GraphicsDevice, GameConstants.VirtualWidth, GameConstants.VirtualHeight);

            Assets.Init(GraphicsDevice, Path.Combine(AppContext.BaseDirectory, GameConstants.AssetsFolder));
            Characters = CharacterRegistry.Load();
            SaveData.Load();
            AssetManifest.WriteMissingReport(Characters);

            ChangeScene(new TitleScene(this));
        }

        public void ChangeScene(Scene scene) => _pendingScene = scene;

        protected override void Update(GameTime gameTime)
        {
            Input.Update();

            if (Input.KeyPressed(Keys.F11)) ToggleFullscreen();
            if (Input.KeyPressed(Keys.F1)) DebugHitboxes = !DebugHitboxes;

            if (_pendingScene != null)
            {
                _scene?.Exit();
                _scene = _pendingScene;
                _pendingScene = null;
                _scene.Enter();
            }

            _scene?.Update();
            base.Update(gameTime);
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.SetRenderTarget(_target);
            GraphicsDevice.Clear(Color.Black);
            _scene?.Draw(_spriteBatch);

            GraphicsDevice.SetRenderTarget(null);
            GraphicsDevice.Clear(Color.Black);

            var pp = GraphicsDevice.PresentationParameters;
            int vw = GameConstants.VirtualWidth, vh = GameConstants.VirtualHeight;
            float scale = Math.Min(pp.BackBufferWidth / (float)vw, pp.BackBufferHeight / (float)vh);
            // Escala inteira quando possivel para manter os pixels perfeitos.
            if (scale >= 1f) scale = MathF.Floor(scale);
            int w = (int)(vw * scale), h = (int)(vh * scale);
            var dest = new Rectangle((pp.BackBufferWidth - w) / 2, (pp.BackBufferHeight - h) / 2, w, h);

            _spriteBatch.Begin(samplerState: SamplerState.PointClamp);
            _spriteBatch.Draw(_target, dest, Color.White);
            _spriteBatch.End();

            base.Draw(gameTime);
        }

        void ToggleFullscreen()
        {
            if (!_graphics.IsFullScreen)
            {
                _graphics.HardwareModeSwitch = false;
                _graphics.PreferredBackBufferWidth = GraphicsAdapter.DefaultAdapter.CurrentDisplayMode.Width;
                _graphics.PreferredBackBufferHeight = GraphicsAdapter.DefaultAdapter.CurrentDisplayMode.Height;
                _graphics.IsFullScreen = true;
            }
            else
            {
                _graphics.PreferredBackBufferWidth = GameConstants.VirtualWidth * GameConstants.WindowScale;
                _graphics.PreferredBackBufferHeight = GameConstants.VirtualHeight * GameConstants.WindowScale;
                _graphics.IsFullScreen = false;
            }
            _graphics.ApplyChanges();
        }

        protected override void UnloadContent()
        {
            Audio.StopMusic();
            base.UnloadContent();
        }
    }
}
