"""Prepara a versao web para publicar.

1. Copia Assets/ (imagens, fases, personagens) para web/assets/ - o arquivo web/assets/Audio/audio.json e mantido.
2. Gera dist/SuperDevStar-web.zip com index.html na raiz (formato que o itch.io pede).

Uso (na pasta do projeto):  python tools/build_web.py
Nao precisa instalar nada alem do Python.
"""
import os
import shutil
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Assets")
WEB = os.path.join(ROOT, "web")
DEST = os.path.join(WEB, "assets")
DIST = os.path.join(ROOT, "dist")


def sync_assets():
    copied = 0
    for folder, _, files in os.walk(SRC):
        rel = os.path.relpath(folder, SRC)
        target = os.path.join(DEST, rel)
        os.makedirs(target, exist_ok=True)
        for name in files:
            src, dst = os.path.join(folder, name), os.path.join(target, name)
            if not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst):
                shutil.copy2(src, dst)
                copied += 1
    print(f"assets atualizados: {copied} arquivo(s)")


def build_zip():
    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, "SuperDevStar-web.zip")
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for folder, _, files in os.walk(WEB):
            for name in files:
                path = os.path.join(folder, name)
                z.write(path, os.path.relpath(path, WEB).replace(os.sep, "/"))
                count += 1
    print(f"gerado {out} ({count} arquivos, {os.path.getsize(out) // 1024} KB)")


if __name__ == "__main__":
    sync_assets()
    build_zip()
