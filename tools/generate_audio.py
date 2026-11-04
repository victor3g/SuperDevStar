"""Gera todos os sons do jogo por sintese, no estilo do chip do NES (onda quadrada, triangulo e ruido).

Efeitos -> Assets/Audio/Sfx/*.wav   |   Musicas -> Assets/Audio/Music/*.mp3   |   lista -> Assets/Audio/audio.json
Todas as melodias sao originais (nada copiado do Mario), entao nao ha problema de direitos autorais.

Uso:  pip install numpy soundfile
      python tools/generate_audio.py
Para mudar um som, edite a funcao dele aqui e rode de novo.
"""
import json
import os
import wave

import numpy as np
import soundfile as sf

SR = 22050
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "Assets", "Audio")
rng = np.random.default_rng(7)

# =====================================================================
# Sintese basica
# =====================================================================
NOTE_INDEX = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def freq(note):
    """'A4', 'C#5', 'Bb3' -> Hz."""
    n = NOTE_INDEX[note[0]]
    i = 1
    while note[i] in "#b":
        n += 1 if note[i] == "#" else -1
        i += 1
    octave = int(note[i:])
    midi = 12 * (octave + 1) + n
    return 440.0 * 2 ** ((midi - 69) / 12)


def samples(seconds):
    return max(1, int(round(seconds * SR)))


def phase(f):
    """f pode ser um numero ou um array (para deslizar a nota)."""
    return np.cumsum(np.broadcast_to(f, f.shape if isinstance(f, np.ndarray) else (1,)) / SR)


def square(f, n, duty=0.5):
    f = np.full(n, f, dtype=float) if np.isscalar(f) else f
    ph = np.cumsum(f / SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)


def triangle(f, n):
    f = np.full(n, f, dtype=float) if np.isscalar(f) else f
    ph = np.cumsum(f / SR) % 1.0
    return 4 * np.abs(ph - 0.5) - 1


def noise(n, rate=SR):
    """Ruido "segura-e-repete": rate menor = ruido mais grave."""
    step = max(1, int(SR / rate))
    vals = rng.uniform(-1, 1, n // step + 2)
    return np.repeat(vals, step)[:n]


def slide(f0, f1, n, curve=1.0):
    t = np.linspace(0, 1, n) ** curve
    return f0 * (f1 / f0) ** t          # deslizamento exponencial (soa "musical")


def env(n, attack=0.004, release=0.03, decay=None, sustain=1.0):
    """Envelope simples: ataque, (queda ate sustain), soltura no final."""
    e = np.ones(n)
    a = min(n, samples(attack))
    r = min(n - a, samples(release))
    e[:a] = np.linspace(0, 1, a)
    if decay:
        d = min(n - a - r, samples(decay))
        e[a:a + d] = np.linspace(1, sustain, d)
        e[a + d:n - r] = sustain
    if r > 0:
        e[n - r:] *= np.linspace(1, 0, r)
    return e


def fade(n, power=1.0):
    return np.linspace(1, 0, n) ** power


def soften(x, amount=0.35):
    """Filtro passa-baixa de 1 polo: tira o "chiado" da onda quadrada."""
    y = np.empty_like(x)
    acc = 0.0
    k = 1 - amount
    for i, v in enumerate(x):
        acc = acc * amount + v * k
        y[i] = acc
    return y


def seq(*parts):
    return np.concatenate(parts)


def silence(seconds):
    return np.zeros(samples(seconds))


def tone(note_or_hz, seconds, wave_fn="square", duty=0.5, vol=1.0, **e):
    n = samples(seconds)
    f = freq(note_or_hz) if isinstance(note_or_hz, str) else note_or_hz
    w = square(f, n, duty) if wave_fn == "square" else triangle(f, n)
    return w * env(n, **e) * vol


def normalize(x, peak=0.85):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


# =====================================================================
# Efeitos sonoros
# =====================================================================
def sfx_jump_small():
    n = samples(0.22)
    return square(slide(330, 880, n, 0.6), n, 0.25) * env(n, release=0.06) * fade(n, 0.5)


def sfx_jump_big():
    n = samples(0.26)
    return square(slide(220, 620, n, 0.6), n, 0.25) * env(n, release=0.07) * fade(n, 0.5)


def sfx_coin():
    return seq(tone("G6", 0.05, duty=0.5, release=0.005),
               tone("C7", 0.32, duty=0.5) * fade(samples(0.32), 1.6))


def sfx_bump():
    n = samples(0.09)
    return (triangle(slide(180, 60, n), n) * 0.9 + noise(n, 3000) * 0.25) * fade(n)


def sfx_break():
    n = samples(0.3)
    crunch = noise(n, 5000) * fade(n, 1.5)
    thud = triangle(slide(140, 40, n), n) * fade(n, 2)
    return crunch * 0.8 + thud * 0.6


def sfx_powerup_appear():
    n = samples(0.5)
    f = slide(200, 900, n)
    f = f * (1 + 0.06 * np.sin(np.arange(n) / SR * 2 * np.pi * 18))   # vibrato
    return square(f, n, 0.5) * env(n, release=0.08) * 0.8


def sfx_powerup():
    notes = ["C5", "G5", "C6", "E5", "B5", "E6", "G5", "D6", "G6", "C6", "G6", "C7"]
    return seq(*[tone(nm, 0.055, duty=0.5, release=0.01) for nm in notes])


def sfx_pipe():
    parts = []
    for _ in range(3):
        n = samples(0.09)
        parts.append(square(slide(500, 120, n), n, 0.5) * fade(n))
        parts.append(silence(0.06))
    return seq(*parts)


def sfx_1up():
    notes = ["C6", "E6", "G6", "C7", "G6", "C7"]
    return seq(*[tone(nm, 0.07, duty=0.25, release=0.01) for nm in notes], silence(0.05))


def sfx_stomp():
    n = samples(0.1)
    return square(slide(700, 180, n), n, 0.5) * fade(n, 0.8)


def sfx_kick():
    n = samples(0.08)
    return square(slide(250, 900, n), n, 0.25) * fade(n) * 0.9 + noise(n, 8000) * fade(n, 3) * 0.3


def sfx_fireball():
    n = samples(0.12)
    return square(slide(1400, 300, n), n, 0.125) * fade(n, 0.7) * 0.8 + noise(n, 9000) * fade(n, 2) * 0.25


def sfx_die():
    lead = seq(tone("B5", 0.08, duty=0.5), silence(0.25),
               *[tone(nm, 0.13, duty=0.5, release=0.02) for nm in ["E5", "D#5", "D5", "C#5", "C5", "B4"]],
               tone("Bb4", 0.5, duty=0.5) * fade(samples(0.5)))
    return lead


def sfx_flagpole():
    n = samples(1.0)
    f = slide(1500, 200, n, 0.8)
    trill = 1 + 0.05 * np.sign(np.sin(np.arange(n) / SR * 2 * np.pi * 24))
    return square(f * trill, n, 0.5) * env(n, release=0.1) * 0.8


def sfx_pause():
    return seq(tone("E6", 0.06, release=0.01), silence(0.03), tone("E6", 0.06, release=0.01),
               silence(0.03), tone("C6", 0.12, release=0.03))


def sfx_hurry():
    parts = []
    for i in range(6):
        parts += [tone("A5" if i % 2 == 0 else "E6", 0.09, duty=0.25, release=0.01), silence(0.02)]
    return seq(*parts, tone("A6", 0.3, duty=0.25) * fade(samples(0.3)))


def sfx_tick():
    return tone("C7", 0.03, duty=0.5, release=0.01) * 0.6


def sfx_firework():
    n = samples(0.6)
    boom = noise(n, 2500) * fade(n, 2.2)
    crackle = noise(n, 11000) * (rng.random(n) > 0.97) * fade(n) * 0.8
    return boom + crackle


def sfx_menu_move():
    return tone("A6", 0.035, duty=0.5, release=0.01) * 0.6


def sfx_menu_select():
    return seq(tone("E6", 0.05, release=0.01), tone("A6", 0.12, release=0.03) * fade(samples(0.12), 0.5))


def sfx_game_over():
    notes = [("C5", 0.3), ("G4", 0.3), ("E4", 0.3), ("A4", 0.25), ("B4", 0.25), ("A4", 0.25),
             ("G#4", 0.25), ("Bb4", 0.25), ("G#4", 0.25), ("G4", 0.15), ("F4", 0.15), ("G4", 0.8)]
    lead = seq(*[tone(nm, d, duty=0.5, release=0.03, decay=0.1, sustain=0.6) for nm, d in notes])
    bass = seq(*[tone(nm[:-1] + str(int(nm[-1]) - 2), d, wave_fn="tri", release=0.03) for nm, d in notes])
    return lead * 0.6 + bass[:len(lead)] * 0.5


def sfx_mug_fall():
    # aviso da caneca de cafe caindo (so com o David): assobio descendo
    n = samples(0.55)
    return square(slide(1400, 500, n, 0.8), n, 0.25) * env(n, release=0.08) * 0.6


def sfx_mug_break():
    # caneca quebrando: tilintar de louca + respingo
    n = samples(0.35)
    clink = seq(tone(2637, 0.04, "square", 0.25, decay=0.03), tone(3136, 0.05, "square", 0.25, decay=0.04))
    clink = np.pad(clink, (0, max(0, n - len(clink))))[:n]
    splash = noise(n, 7000) * fade(n, 2.5)
    return clink * 0.7 + splash * 0.6


SFX = {name[4:]: fn for name, fn in globals().items() if name.startswith("sfx_")}

# =====================================================================
# Musica: um mini "tracker"
#   notas: lista de (nota, duracao em colcheias); "-" = pausa
#   bateria: uma string por compasso com 8 colcheias: k = bumbo, s = caixa, h = chimbal, - = nada
# =====================================================================
def render_voice(notes, eighth, kind="square", duty=0.5, vol=1.0, gate=0.88, decay=0.12, sustain=0.65):
    out = []
    for nm, length in notes:
        dur = length * eighth
        if nm == "-":
            out.append(silence(dur))
            continue
        n = samples(dur)
        on = max(1, int(n * gate))
        f = freq(nm)
        w = square(f, on, duty) if kind == "square" else triangle(f, on)
        w = w * env(on, attack=0.003, release=0.02, decay=decay, sustain=sustain) * vol
        out.append(np.concatenate([w, np.zeros(n - on)]))
    return np.concatenate(out)


def drum_hit(kind):
    if kind == "k":
        n = samples(0.12)
        return triangle(slide(160, 45, n), n) * fade(n, 1.2) * 1.0
    if kind == "s":
        n = samples(0.13)
        return (noise(n, 7000) * 0.7 + triangle(slide(240, 160, n), n) * 0.3) * fade(n, 1.5) * 0.7
    n = samples(0.035)
    return noise(n, 14000) * fade(n, 2) * 0.25          # chimbal


def render_drums(bars, eighth):
    total = samples(len(bars) * 8 * eighth)
    out = np.zeros(total + samples(0.2))
    for b, pattern in enumerate(bars):
        for i, ch in enumerate(pattern):
            if ch == "-":
                continue
            hit = drum_hit(ch)
            start = samples((b * 8 + i) * eighth)
            out[start:start + len(hit)] += hit
    return out[:total]


def mix(*tracks):
    n = max(len(t) for t, _ in tracks)
    out = np.zeros(n)
    for t, v in tracks:
        out[:len(t)] += t * v
    return out


def bass_line(chords, pattern="R-5-R-5-", octave=2):
    """chords: lista de acordes (raiz, terca, quinta) por compasso. pattern por colcheia: R raiz, 5 quinta, 8 oitava."""
    notes = []
    for root, _third, fifth in chords:
        for ch in pattern:
            if ch == "-":
                notes.append(("-", 1))
            elif ch == "R":
                notes.append((f"{root}{octave}", 1))
            elif ch == "5":
                notes.append((f"{fifth}{octave}", 1))
            elif ch == "8":
                notes.append((f"{root}{octave + 1}", 1))
    return notes


def arpeggio(chords, octave=4, pattern=(0, 1, 2, 1, 0, 1, 2, 1)):
    notes = []
    for chord in chords:
        for idx in pattern:
            notes.append((f"{chord[idx]}{octave}", 1))
    return notes


C, Am, F, G, Em, Dm, E = ("C", "E", "G"), ("A", "C", "E"), ("F", "A", "C"), ("G", "B", "D"), ("E", "G", "B"), ("D", "F", "A"), ("E", "G#", "B")
Bb = ("Bb", "D", "F")


def song_overworld():
    bpm, eighth = 150, 60 / 150 / 2
    lead = [
        ("E5", 2), ("G5", 2), ("C6", 2), ("G5", 2),       ("A5", 3), ("G5", 1), ("E5", 2), ("C5", 2),
        ("F5", 2), ("A5", 2), ("C6", 2), ("A5", 1), ("G5", 1), ("G5", 4), ("D5", 2), ("B4", 2),
        ("E5", 1), ("E5", 1), ("G5", 2), ("C6", 2), ("E6", 2), ("D6", 2), ("C6", 2), ("A5", 2), ("G5", 2),
        ("F5", 2), ("A5", 2), ("G5", 2), ("B5", 2),       ("C6", 6), ("-", 2),
        ("A5", 2), ("C6", 2), ("A5", 2), ("F5", 2),       ("B5", 2), ("D6", 2), ("B5", 2), ("G5", 2),
        ("G5", 2), ("E5", 2), ("B5", 3), ("A5", 1),       ("A5", 4), ("-", 2), ("E5", 2),
        ("F5", 1), ("A5", 1), ("C6", 2), ("F6", 2), ("E6", 2), ("D6", 2), ("B5", 2), ("G5", 2), ("D6", 2),
        ("C6", 2), ("G5", 2), ("E5", 2), ("C5", 2),       ("D5", 2), ("G5", 2), ("B5", 2), ("D6", 2),
    ]
    chords = [C, Am, F, G, C, Am, F, C, F, G, Em, Am, F, G, C, G]
    bass = bass_line(chords, "R-5-R-58")
    harmony = arpeggio(chords, 4, (0, 2, 1, 2, 0, 2, 1, 2))
    drums = ["k-h-s-h-", "k-h-s-hk"] * 8
    return mix((render_voice(lead, eighth, duty=0.5), 0.34),
               (render_voice(harmony, eighth, duty=0.125, gate=0.5), 0.10),
               (render_voice(bass, eighth, "tri", gate=0.8), 0.42),
               (render_drums(drums, eighth), 0.45))


def song_underground():
    eighth = 60 / 120 / 2
    bars = [
        [("A4", 1), ("-", 1), ("C5", 1), ("-", 1), ("E5", 1), ("-", 1), ("A5", 1), ("-", 1)],
        [("A4", 1), ("-", 1), ("C5", 1), ("-", 1), ("F5", 1), ("-", 1), ("A5", 1), ("-", 1)],
        [("D5", 1), ("-", 1), ("F5", 1), ("-", 1), ("A5", 1), ("-", 1), ("D6", 1), ("-", 1)],
        [("E5", 1), ("-", 1), ("G#5", 1), ("-", 1), ("B5", 1), ("-", 1), ("E6", 1), ("-", 1)],
        [("A5", 1), ("-", 1), ("E5", 1), ("-", 1), ("C5", 1), ("-", 1), ("E5", 1), ("-", 1)],
        [("F5", 1), ("-", 1), ("C5", 1), ("-", 1), ("A4", 1), ("-", 1), ("C5", 1), ("-", 1)],
        [("D5", 1), ("F5", 1), ("A5", 1), ("-", 1), ("G#5", 1), ("-", 1), ("F5", 1), ("-", 1)],
        [("E5", 2), ("-", 2), ("B4", 1), ("-", 1), ("E5", 1), ("-", 1)],
    ]
    lead = [n for bar in bars for n in bar]
    chords = [Am, F, Dm, E, Am, F, Dm, E]
    bass = bass_line(chords, "R---R-R-", octave=2)
    drums = ["k---k-h-", "k---k-hh"] * 4
    return mix((render_voice(lead, eighth, duty=0.25, gate=0.6, decay=0.05, sustain=0.4), 0.38),
               (render_voice(bass, eighth, "tri", gate=0.9), 0.45),
               (render_drums(drums, eighth), 0.30))


def song_star():
    eighth = 60 / 180 / 2
    motif = []
    for chord, top in [(("C6", "A5", "F5"), ("C6", "F6")), (("D6", "Bb5", "F5"), ("D6", "F6")),
                       (("C6", "A5", "F5"), ("C6", "F6")), (("E6", "C6", "G5"), ("E6", "G6"))]:
        a, b, c = chord
        motif += [(a, 1), (b, 1), (c, 1), (b, 1), (top[0], 2), (top[1], 2)]
    lead = motif * 2
    chords = [F, Bb, F, C] * 2
    bass = bass_line(chords, "R8R8R8R8", octave=2)
    drums = ["khshkhsh"] * 8
    return mix((render_voice(lead, eighth, duty=0.25, gate=0.8), 0.34),
               (render_voice(bass, eighth, "tri", gate=0.7), 0.42),
               (render_drums(drums, eighth), 0.40))


def song_title():
    eighth = 60 / 130 / 2
    lead = [("G5", 3), ("E5", 1), ("C5", 2), ("E5", 2), ("F5", 2), ("A5", 2), ("C6", 4),
            ("B5", 2), ("D6", 2), ("G5", 2), ("B5", 2), ("C6", 6), ("-", 2),
            ("A5", 2), ("C6", 2), ("E6", 2), ("C6", 2), ("F5", 2), ("A5", 2), ("C6", 2), ("F6", 2),
            ("G5", 2), ("B5", 2), ("D6", 2), ("F6", 2), ("E6", 6), ("-", 2)]
    chords = [C, F, G, C, Am, F, G, C]
    bass = bass_line(chords, "R-R-5-8-")
    harmony = arpeggio(chords, 4)
    drums = ["k-h-s-h-", "k-hks-h-", "k-h-s-h-", "k-h-s-ss"] * 2
    return mix((render_voice(lead, eighth, duty=0.5), 0.34),
               (render_voice(harmony, eighth, duty=0.125, gate=0.5), 0.10),
               (render_voice(bass, eighth, "tri"), 0.42),
               (render_drums(drums, eighth), 0.40))


def song_select():
    eighth = 60 / 110 / 2
    lead = [("E5", 4), ("C5", 4), ("A4", 4), ("C5", 4), ("G5", 4), ("E5", 4), ("D5", 6), ("-", 2),
            ("E5", 2), ("A5", 2), ("C6", 4), ("C6", 2), ("A5", 2), ("F5", 4), ("G5", 4), ("E5", 4), ("D5", 4), ("B4", 4)]
    chords = [Am, F, C, G, Am, F, C, G]
    pad = arpeggio(chords, 4, (0, 1, 2, 1, 0, 1, 2, 1))
    bass = bass_line(chords, "R---5---")
    drums = ["k---s---", "k-k-s---"] * 4
    return mix((render_voice(lead, eighth, duty=0.25, decay=0.3, sustain=0.5), 0.30),
               (render_voice(pad, eighth, duty=0.125, gate=0.6), 0.12),
               (render_voice(bass, eighth, "tri"), 0.42),
               (render_drums(drums, eighth), 0.25))


def song_stage_clear():
    eighth = 60 / 150 / 2
    lead = [("C5", 1), ("E5", 1), ("G5", 1), ("C6", 3), ("-", 2), ("F5", 1), ("A5", 1), ("C6", 1), ("F6", 3), ("-", 2),
            ("G5", 1), ("B5", 1), ("D6", 1), ("G6", 3), ("-", 2), ("C6", 2), ("E6", 2), ("G6", 4)]
    bass = [("C3", 6), ("-", 2), ("F2", 6), ("-", 2), ("G2", 6), ("-", 2), ("C3", 8)]
    drums = ["k-----s-", "k-----s-", "k-----s-", "k-s-k-s-"]
    music = mix((render_voice(lead, eighth, duty=0.5, gate=0.95), 0.4),
                (render_voice(bass, eighth, "tri", gate=0.95), 0.45),
                (render_drums(drums, eighth), 0.4))
    return np.concatenate([music, silence(0.4)])


def song_ending():
    eighth = 60 / 120 / 2
    lead = [("E5", 2), ("G5", 2), ("C6", 4), ("D6", 2), ("B5", 2), ("G5", 4), ("C6", 2), ("A5", 2), ("E5", 4),
            ("F5", 2), ("A5", 2), ("C6", 4), ("E6", 4), ("D6", 2), ("C6", 2), ("B5", 4), ("D6", 4),
            ("C6", 4), ("A5", 2), ("E6", 2), ("F6", 6), ("-", 2), ("A5", 2), ("C6", 2), ("F6", 4),
            ("B5", 2), ("D6", 2), ("G6", 4), ("G6", 2), ("E6", 2), ("C6", 4), ("C6", 8)]
    chords = [C, G, Am, F, C, G, Am, F, F, G, C, C]
    bass = bass_line(chords, "R-5-8-5-")
    harmony = arpeggio(chords, 4)
    drums = ["k-h-s-h-"] * 11 + ["k-s-k-ss"]
    return mix((render_voice(lead, eighth, duty=0.5), 0.34),
               (render_voice(harmony, eighth, duty=0.125, gate=0.5), 0.10),
               (render_voice(bass, eighth, "tri"), 0.42),
               (render_drums(drums, eighth), 0.38))


SONGS = {name[5:]: fn for name, fn in globals().items() if name.startswith("song_")}
LOOPING = {"stage_clear": False}

# =====================================================================
# Saida
# =====================================================================
def write_wav(path, data):
    data = np.clip(data, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    os.makedirs(os.path.join(OUT, "Sfx"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "Music"), exist_ok=True)
    manifest = {"_comment": "Gerado por tools/generate_audio.py. Caminhos relativos a assets/Audio/.",
                "sfx": {}, "music": {}}
    for name, fn in SFX.items():
        data = normalize(soften(fn(), 0.25), 0.8)
        path = os.path.join(OUT, "Sfx", f"{name}.wav")
        write_wav(path, data)
        manifest["sfx"][name] = f"Sfx/{name}.wav"
        print(f"sfx   {name:15s} {len(data) / SR:5.2f}s  {os.path.getsize(path) // 1024:4d} KB")
    for name, fn in SONGS.items():
        data = normalize(soften(fn(), 0.3), 0.8).astype("float32")
        path = os.path.join(OUT, "Music", f"{name}.mp3")
        sf.write(path, data, SR, format="MP3")
        manifest["music"][name] = f"Music/{name}.mp3"
        print(f"music {name:15s} {len(data) / SR:5.2f}s  {os.path.getsize(path) // 1024:4d} KB")
    with open(os.path.join(OUT, "audio.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("audio.json atualizado")


if __name__ == "__main__":
    main()
