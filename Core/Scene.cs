using Microsoft.Xna.Framework.Graphics;

namespace SuperDevStar.Core
{
    /// <summary>Uma tela do jogo (titulo, selecao, fase...). Update roda 60x por segundo.</summary>
    public abstract class Scene
    {
        protected readonly SuperDevStarGame Game;

        protected Scene(SuperDevStarGame game)
        {
            Game = game;
        }

        public virtual void Enter() { }
        public virtual void Exit() { }
        public abstract void Update();
        public abstract void Draw(SpriteBatch sb);
    }
}
