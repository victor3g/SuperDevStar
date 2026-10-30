using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using SuperDevStar.Core;
using SuperDevStar.Entities;
using SuperDevStar.Scenes;

namespace SuperDevStar.World
{
    /// <summary>
    /// Estado em tempo de execucao de uma area da fase: mapa de tiles, entidades, camera e cenario.
    /// Legenda dos caracteres do mapa em docs/LEVEL_FORMAT.md.
    /// </summary>
    public sealed class Stage
    {
        const int T = GameConstants.TileSize;

        readonly List<Entity> _toAdd = new();

        public GameplayScene Scene { get; }
        public AreaData Data { get; }
        public TileMap Map { get; }
        public TileSet Tiles { get; }
        public Camera2D Camera { get; } = new Camera2D();
        public List<Entity> Entities { get; } = new();
        public List<DecorInstance> Decor { get; } = new();
        public List<BackgroundLayer> Backgrounds { get; } = new();
        public Flagpole Flagpole { get; private set; }

        public Point PlayerSpawn { get; private set; } = new Point(2, 12);
        public Point? Checkpoint { get; private set; }
        public Point? CastleDoor { get; private set; }
        public int FrameCounter { get; private set; }

        public Player Player => Scene.Player;
        public string Theme => Data.Theme;

        public Stage(GameplayScene scene, AreaData data)
        {
            Scene = scene;
            Data = data;

            int height = data.Rows.Count;
            int width = data.Rows.Max(r => r.Length);
            Map = new TileMap(width, height);
            Tiles = new TileSet(data.Theme);

            Point? flagTop = null;
            for (int y = 0; y < height; y++)
            {
                string row = data.Rows[y];
                for (int x = 0; x < width; x++)
                {
                    char c = x < row.Length ? row[x] : '.';
                    if (c == 'F') flagTop = new Point(x, y);
                    else Build(c, x, y);
                }
            }

            if (flagTop.HasValue)
            {
                int bottom = flagTop.Value.Y + 1;
                while (bottom < height && !Map.IsSolid(flagTop.Value.X, bottom)) bottom++;
                Flagpole = new Flagpole(flagTop.Value.X, flagTop.Value.Y, bottom) { Stage = this };
            }

            foreach (var d in data.Decor)
                Decor.Add(new DecorInstance(d.Name, d.TileX * T, (d.TileY + 1) * T, false, d.Front));
            if (CastleDoor.HasValue)
                Decor.Add(new DecorInstance("datacenter", CastleDoor.Value.X * T + T / 2f, (CastleDoor.Value.Y + 1) * T, true, false));
            foreach (var b in data.Backgrounds)
                Backgrounds.Add(new BackgroundLayer(b));

            FlushSpawns();
        }

        void Build(char c, int x, int y)
        {
            ref Tile t = ref Map[x, y];
            switch (c)
            {
                case '#': t.Type = TileType.Ground; break;
                case 'B': t.Type = TileType.Brick; break;
                case 'C': t.Type = TileType.Brick; t.Content = BlockContent.MultiCoin; break;
                case 'm': t.Type = TileType.Brick; t.Content = BlockContent.PowerUp; break;
                case '*': t.Type = TileType.Brick; t.Content = BlockContent.Star; break;
                case 'U': t.Type = TileType.Brick; t.Content = BlockContent.OneUp; break;
                case '?': t.Type = TileType.Question; t.Content = BlockContent.Coin; break;
                case 'M': t.Type = TileType.Question; t.Content = BlockContent.PowerUp; break;
                case 'X': t.Type = TileType.Hard; break;
                case 'I': t.Type = TileType.Invisible; t.Content = BlockContent.OneUp; break;
                case 'i': t.Type = TileType.Invisible; t.Content = BlockContent.Coin; break;
                case '[': t.Type = TileType.PipeTopLeft; break;
                case ']': t.Type = TileType.PipeTopRight; break;
                case '(': t.Type = TileType.PipeLeft; break;
                case ')': t.Type = TileType.PipeRight; break;
                case '{': t.Type = TileType.HPipeMouthTop; break;
                case '}': t.Type = TileType.HPipeMouthBottom; break;
                case '~': t.Type = TileType.HPipeBodyTop; break;
                case '-': t.Type = TileType.HPipeBodyBottom; break;
                case 'o': Spawn(new Coin(x * T, y * T)); break;
                case 'g': Spawn(new Bug(x * T, y * T, Theme)); break;
                case 'k': Spawn(new Virus(x * T, y * T, Theme)); break;
                case 'P': PlayerSpawn = new Point(x, y); break;
                case 'K': Checkpoint = new Point(x, y); break;
                case 'D': CastleDoor = new Point(x, y); break;
            }
        }

        public void Spawn(Entity e)
        {
            e.Stage = this;
            _toAdd.Add(e);
        }

        void FlushSpawns()
        {
            if (_toAdd.Count == 0) return;
            foreach (var e in _toAdd) e.PrevPosition = e.Position;
            Entities.AddRange(_toAdd);
            _toAdd.Clear();
        }

        public int Count<TEntity>() where TEntity : Entity
        {
            int n = 0;
            foreach (var e in Entities) if (!e.Removed && e is TEntity) n++;
            foreach (var e in _toAdd) if (!e.Removed && e is TEntity) n++;
            return n;
        }

        public void Update(bool frozen)
        {
            FlushSpawns();
            if (frozen) return;

            FrameCounter++;
            Map.Update();
            for (int i = 0; i < Entities.Count; i++)
            {
                var e = Entities[i];
                if (e.Removed) continue;
                e.PrevPosition = e.Position;
                e.Update();
            }
            Flagpole?.Update();
            ResolveEnemyCollisions();
            FlushSpawns();
        }

        public void ResolvePlayerInteractions()
        {
            var p = Player;
            var pb = p.Bounds;
            for (int i = 0; i < Entities.Count; i++)
            {
                var e = Entities[i];
                if (e.Removed || !e.InteractsWithPlayer) continue;
                if (p.Mode != PlayerMode.Normal) break;
                if (pb.Intersects(e.Bounds)) e.OnTouchPlayer(p);
            }
        }

        void ResolveEnemyCollisions()
        {
            for (int i = 0; i < Entities.Count; i++)
            {
                if (Entities[i] is not Enemy a || !a.IsActive) continue;
                for (int j = i + 1; j < Entities.Count; j++)
                {
                    if (Entities[j] is not Enemy b || !b.IsActive) continue;
                    if (!a.IsActive) break;
                    if (!a.Bounds.Intersects(b.Bounds)) continue;

                    if (a.IsMovingShell && b.IsMovingShell)
                    {
                        a.KillFlipped(Math.Sign(a.CenterX - b.CenterX), 500);
                        b.KillFlipped(Math.Sign(b.CenterX - a.CenterX), 500);
                    }
                    else if (a.IsMovingShell) ShellKill((Virus)a, b);
                    else if (b.IsMovingShell) ShellKill((Virus)b, a);
                    else
                    {
                        // Inimigos que se encostam viram para lados opostos.
                        var left = a.CenterX <= b.CenterX ? a : b;
                        var right = left == a ? b : a;
                        if (left.Velocity.X > 0) left.Velocity.X = -left.Velocity.X;
                        if (right.Velocity.X < 0) right.Velocity.X = -right.Velocity.X;
                    }
                }
            }
        }

        void ShellKill(Virus shell, Enemy victim)
        {
            int points = shell.NextShellComboPoints();
            victim.KillFlipped(Math.Sign(shell.Velocity.X), points > 0 ? points : 0);
            if (points < 0) Scene.GiveOneUp(victim.CenterX, victim.Top);
        }

        /// <summary>O jogador bateu a cabeca no tile (tx, ty).</summary>
        public void HitBlock(int tx, int ty, Player player)
        {
            if (!Map.InBounds(tx, ty)) return;
            ref Tile t = ref Map[tx, ty];

            switch (t.Type)
            {
                case TileType.Question:
                case TileType.Invisible:
                    SpawnContent(tx, ty, t.Content == BlockContent.None ? BlockContent.Coin : t.Content, player);
                    t.Type = TileType.Used;
                    t.Content = BlockContent.None;
                    t.BumpTimer = TileMap.BumpDuration;
                    BumpEntitiesAbove(tx, ty);
                    break;

                case TileType.Brick:
                    if (t.Content == BlockContent.MultiCoin)
                    {
                        if (!t.MultiCoinStarted)
                        {
                            t.MultiCoinStarted = true;
                            t.MultiCoinTimer = 240;
                        }
                        SpawnContent(tx, ty, BlockContent.Coin, player);
                        t.CoinsGiven++;
                        t.BumpTimer = TileMap.BumpDuration;
                        if (t.MultiCoinTimer <= 0 || t.CoinsGiven >= 15)
                        {
                            t.Type = TileType.Used;
                            t.Content = BlockContent.None;
                        }
                        BumpEntitiesAbove(tx, ty);
                    }
                    else if (t.Content != BlockContent.None)
                    {
                        SpawnContent(tx, ty, t.Content, player);
                        t.Type = TileType.Used;
                        t.Content = BlockContent.None;
                        t.BumpTimer = TileMap.BumpDuration;
                        BumpEntitiesAbove(tx, ty);
                    }
                    else if (player.IsBig)
                    {
                        t.Type = TileType.Empty;
                        t.BumpTimer = 0;
                        BreakBrick(tx, ty);
                        BumpEntitiesAbove(tx, ty);
                    }
                    else
                    {
                        t.BumpTimer = TileMap.BumpDuration;
                        Audio.Play("bump");
                        BumpEntitiesAbove(tx, ty);
                    }
                    break;

                default:
                    Audio.Play("bump");
                    break;
            }
        }

        void BreakBrick(int tx, int ty)
        {
            Audio.Play("break");
            Scene.AddScore(50, 0, 0, popup: false);
            float cx = tx * T + 4, cy = ty * T + 4;
            Spawn(new BrickDebris(cx - 4, cy - 4, -1f, -6f, Theme));
            Spawn(new BrickDebris(cx + 4, cy - 4, 1f, -6f, Theme));
            Spawn(new BrickDebris(cx - 4, cy + 4, -1f, -4f, Theme));
            Spawn(new BrickDebris(cx + 4, cy + 4, 1f, -4f, Theme));
        }

        void SpawnContent(int tx, int ty, BlockContent content, Player player)
        {
            switch (content)
            {
                case BlockContent.Coin:
                case BlockContent.MultiCoin:
                    Spawn(new CoinPop(tx * T, ty * T - T));
                    Scene.CollectCoin(tx * T + 8, ty * T, popup: false);
                    break;
                case BlockContent.PowerUp:
                    Item item = player.IsBig ? new Firewall(tx * T, ty * T) : new Coffee(tx * T, ty * T);
                    Spawn(item);
                    item.Emerge();
                    break;
                case BlockContent.Star:
                    var star = new SudoStar(tx * T, ty * T);
                    Spawn(star);
                    star.Emerge();
                    break;
                case BlockContent.OneUp:
                    var backup = new Backup(tx * T, ty * T);
                    Spawn(backup);
                    backup.Emerge();
                    break;
            }
        }

        /// <summary>Inimigos em cima de um bloco atingido morrem; itens pulam; moedas sao coletadas.</summary>
        void BumpEntitiesAbove(int tx, int ty)
        {
            float top = ty * T;
            float left = tx * T, right = left + T;
            float fromX = left + T / 2f;
            foreach (var e in Entities)
            {
                if (e.Removed) continue;
                if (e.Right <= left || e.Left >= right) continue;
                if (Math.Abs(e.Bottom - top) > 3f) continue;

                switch (e)
                {
                    case Enemy enemy when enemy.IsActive:
                        enemy.OnBumpedFromBelow(fromX);
                        break;
                    case Item item:
                        item.Hop(fromX);
                        break;
                    case Coin coin:
                        coin.Removed = true;
                        Spawn(new CoinPop(coin.Position.X - 1, coin.Position.Y));
                        Scene.CollectCoin(coin.CenterX, coin.Top, popup: false);
                        break;
                }
            }
        }

        public void Cleanup() => Entities.RemoveAll(e => e.Removed);

        public void Draw(SpriteBatch sb)
        {
            // Ceu e fundos (coordenadas de tela)
            Gfx.Begin(sb);
            Gfx.Rect(sb, new Rectangle(0, 0, Camera.Width, Camera.Height), Data.Sky);
            foreach (var bg in Backgrounds) bg.Draw(sb, Camera);
            sb.End();

            // Mundo (coordenadas do mapa)
            Gfx.Begin(sb, Camera.Transform);
            foreach (var d in Decor) if (!d.Front) d.Draw(sb, Camera);

            foreach (var e in Entities) if (e.Layer == DrawLayer.BehindTiles && !e.Removed) e.Draw(sb);
            if (Player != null && Player.Stage == this && Player.BehindTiles) Player.Draw(sb);

            Map.Draw(sb, Tiles, Camera, FrameCounter);
            Flagpole?.Draw(sb);

            foreach (var e in Entities) if (e.Layer == DrawLayer.Normal && !e.Removed) e.Draw(sb);
            if (Player != null && Player.Stage == this && !Player.BehindTiles) Player.Draw(sb);
            foreach (var e in Entities) if (e.Layer == DrawLayer.Front && !e.Removed) e.Draw(sb);

            foreach (var d in Decor) if (d.Front) d.Draw(sb, Camera);

            if (SuperDevStarGame.DebugHitboxes)
            {
                foreach (var e in Entities) if (!e.Removed) e.DrawDebug(sb);
                Player?.DrawDebug(sb);
            }
            sb.End();
        }
    }
}
