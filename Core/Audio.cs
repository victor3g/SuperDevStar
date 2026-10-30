using Microsoft.Xna.Framework.Audio;

namespace SuperDevStar.Core
{
    /// <summary>
    /// Efeitos: Assets/Audio/Sfx/{nome}.wav  |  Musicas: Assets/Audio/Music/{nome}.wav (tocadas em loop).
    /// Arquivo ausente = silencio (o jogo continua funcionando).
    /// </summary>
    public static class Audio
    {
        static SoundEffectInstance _music;
        static string _musicName;

        public static float MusicVolume { get; set; } = 0.55f;
        public static float SfxVolume { get; set; } = 0.8f;

        public static void Play(string name)
        {
            var sfx = Assets.Sound($"Audio/Sfx/{name}.wav");
            sfx?.Play(SfxVolume, 0f, 0f);
        }

        public static void PlayMusic(string name, bool loop = true)
        {
            if (_music != null && _musicName == name && _music.State == SoundState.Playing) return;
            StopMusic();
            if (string.IsNullOrEmpty(name)) return;

            var track = Assets.Sound($"Audio/Music/{name}.wav");
            if (track == null) return;
            _music = track.CreateInstance();
            _music.IsLooped = loop;
            _music.Volume = MusicVolume;
            _music.Play();
            _musicName = name;
        }

        public static void StopMusic()
        {
            if (_music != null)
            {
                _music.Stop();
                _music.Dispose();
            }
            _music = null;
            _musicName = null;
        }

        public static void PauseMusic()
        {
            if (_music?.State == SoundState.Playing) _music.Pause();
        }

        public static void ResumeMusic()
        {
            if (_music?.State == SoundState.Paused) _music.Resume();
        }

        /// <summary>Usado no "hurry up" (tempo &lt; 100): musica mais aguda/rapida.</summary>
        public static void SetMusicPitch(float pitch)
        {
            if (_music != null) _music.Pitch = Math.Clamp(pitch, -1f, 1f);
        }
    }
}
