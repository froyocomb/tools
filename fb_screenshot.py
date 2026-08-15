#!/usr/bin/env python3
"""
fb_screenshot.py - Correct framebuffer screenshot tool for old Android devices/emulators.

Why this exists
----------------
On early Android (1.0/1.1-era) devices and emulators there is no `screencap`
binary and no MediaCodec-based mirroring (scrcpy). The only built-in option
is DDMS's "Screen Capture", which pulls the raw framebuffer over adb and
converts it with com.android.ddmlib.RawImage.getARGB(). That method scales
n-bit color samples up to a byte with a plain left-shift:

    r = (5-bit red sample) << 3   -> max value 248, not 255
    g = (6-bit green sample) << 2 -> max value 252, not 255
    b = (5-bit blue sample) << 3  -> max value 248, not 255

That leaves the low-order bits zero-filled instead of properly scaled,
so every DDMS screenshot from a 16bpp (RGB565) framebuffer comes out a
few percent darker than the real pixel values.

This script pulls the same raw framebuffer via plain `adb pull` (no DDMS
involved at all) and converts it properly using bit replication, so
values scale correctly across the full 0-255 range.

Requirements
------------
    - Python 3.7+
    - Pillow  (pip install Pillow)
    - adb.exe available either:
        a) sitting in the same folder as this script (on Windows, older
           adb.exe builds also need AdbWinApi.dll and AdbWinUsbApi.dll
           alongside it -- just drop all three files next to this script), or
        b) on your system PATH
      Device connected with USB debugging on (or emulator running)

Usage
-----
    # Auto-detect resolution/bpp from the adb-reported framebuffer info
    # (falls back to sensible QVGA/HVGA defaults if that fails)
    python fb_screenshot.py screenshot.png

    # Explicit resolution + bit depth, e.g. HVGA portrait, 16bpp RGB565
    python fb_screenshot.py screenshot.png --width 320 --height 480 --bpp 16

    # If you already have a raw dump on disk (e.g. from `adb pull /dev/fb0 fb`)
    python fb_screenshot.py screenshot.png --raw-file fb --width 320 --height 240 --bpp 16

    # Give yourself 5 seconds to set up an interaction on the device (e.g.
    # holding a widget mid-drag) before the capture actually happens. A
    # countdown is printed to the console; the capture fires the instant
    # it hits zero, so keep holding through "1..."
    python fb_screenshot.py screenshot.png --delay 5
"""

import argparse
import shutil
import subprocess
import sys
import os
import tempfile
import time
import math

try:
    from PIL import Image
except ImportError:
    print("This script needs Pillow. Install it with:  pip install Pillow", file=sys.stderr)
    sys.exit(1)


FB_DEVICE_PATHS = ["/dev/graphics/fb0", "/dev/fb0"]


def find_adb():
    """
    Locate the adb executable. Checked in order:
      1. The same folder as this script (e.g. adb.exe dropped alongside it,
         which is the simplest setup on Windows -- no PATH editing needed).
      2. The system PATH (via shutil.which, which correctly handles the
         .exe extension and PATHEXT on Windows -- plain "adb" as a bare
         subprocess argument does NOT get resolved this way on Windows).
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for name in ("adb.exe", "adb"):
        candidate = os.path.join(script_dir, name)
        if os.path.isfile(candidate):
            return candidate

    found = shutil.which("adb")
    if found:
        return found

    raise RuntimeError(
        "Could not find adb. Either:\n"
        f"  - drop adb.exe (and, for older platform-tools, AdbWinApi.dll +\n"
        f"    AdbWinUsbApi.dll) into this folder: {script_dir}\n"
        "  - or add adb's folder to your system PATH"
    )


def run_adb(args, **kw):
    adb_path = find_adb()
    return subprocess.run([adb_path] + args, **kw)


def pull_framebuffer(tmp_path):
    """Try each known framebuffer device path until one works."""
    last_err = None
    for dev_path in FB_DEVICE_PATHS:
        try:
            result = run_adb(["pull", dev_path, tmp_path], capture_output=True, text=True)
        except RuntimeError as e:
            # find_adb() couldn't locate adb at all -- no point trying other paths.
            raise
        except OSError as e:
            last_err = str(e)
            continue
        if result.returncode == 0 and os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
            print(f"Pulled framebuffer from {dev_path} ({os.path.getsize(tmp_path)} bytes)")
            return dev_path
        last_err = result.stderr
    raise RuntimeError(
        "Could not pull a framebuffer device via adb. Tried: "
        + ", ".join(FB_DEVICE_PATHS)
        + f"\nLast adb error: {last_err}"
    )


def scale_sample_to_byte(sample, bits):
    """
    Scale an n-bit color sample (0..2^bits-1) up to a full byte (0..255)
    using bit replication, so the true maximum value maps to 255 instead
    of to (2^bits-1) << (8-bits), which is what DDMS's naive shift does.
    """
    if bits <= 0:
        return 0
    if bits >= 8:
        return sample >> (bits - 8)
    shift = 8 - bits
    scaled = sample << shift
    # Fill the low-order bits with a copy of the sample's own high bits.
    fill = sample >> max(0, bits - shift)
    return (scaled | fill) & 0xFF


# Precompute lookup tables for the common bit depths so we're not doing
# this per-pixel in a slow Python loop.
def build_lut(bits):
    return [scale_sample_to_byte(v, bits) for v in range(1 << bits)]


def decode_rgb565(data, width, height):
    lut5 = build_lut(5)
    lut6 = build_lut(6)

    import numpy as np
    arr = np.frombuffer(data[: width * height * 2], dtype="<u2").reshape(height, width)

    r5 = (arr >> 11) & 0x1F
    g6 = (arr >> 5) & 0x3F
    b5 = arr & 0x1F

    lut5_np = np.array(lut5, dtype=np.uint8)
    lut6_np = np.array(lut6, dtype=np.uint8)

    r = lut5_np[r5]
    g = lut6_np[g6]
    b = lut5_np[b5]

    return np.stack([r, g, b], axis=-1)


def decode_rgba8888(data, width, height):
    import numpy as np
    arr = np.frombuffer(data[: width * height * 4], dtype=np.uint8).reshape(height, width, 4)
    # Already 8 bits per channel -- no scaling needed, just drop alpha.
    return arr[:, :, 0:3]


def decode_framebuffer(data, width, height, bpp):
    frame_bytes = width * height * (bpp // 8)
    if len(data) < frame_bytes:
        raise ValueError(
            f"File too small for {width}x{height} @ {bpp}bpp "
            f"(need {frame_bytes} bytes, got {len(data)})"
        )
    # Some devices double-buffer the framebuffer (file = 2x a single frame).
    # We only want the first, current frame.
    data = data[:frame_bytes]

    if bpp == 16:
        return decode_rgb565(data, width, height)
    elif bpp == 32:
        return decode_rgba8888(data, width, height)
    else:
        raise ValueError(f"Unsupported bpp: {bpp} (only 16 and 32 are handled)")


def countdown(delay_seconds):
    """
    Prints a live countdown to the console and blocks until it reaches zero.
    Whole seconds are counted down one at a time; any leftover fractional
    part is slept first so "3... 2... 1..." lines up with real seconds.
    """
    if delay_seconds <= 0:
        return

    whole_seconds = int(math.floor(delay_seconds))
    fractional = delay_seconds - whole_seconds

    print(f"Capturing in {delay_seconds:g}s")

    if fractional > 0:
        time.sleep(fractional)

    for remaining in range(whole_seconds, 0, -1):
        print(f"  {remaining}...", flush=True)
        time.sleep(1)

    print("  Capturing now!", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("output", help="Output PNG path")
    parser.add_argument("--width", type=int, default=320, help="Framebuffer width in pixels (default: 320)")
    parser.add_argument("--height", type=int, default=240, help="Framebuffer height in pixels (default: 240)")
    parser.add_argument("--bpp", type=int, default=16, choices=[16, 32], help="Bits per pixel (default: 16 = RGB565)")
    parser.add_argument("--raw-file", help="Use an existing raw framebuffer dump instead of pulling one via adb")
    parser.add_argument(
        "--delay",
        type=float,
        default=0,
        help="Seconds to wait (with a console countdown) before capturing -- "
             "gives you time to set up an interaction on the device, e.g. "
             "holding a widget mid-drag (default: 0, capture immediately)",
    )
    args = parser.parse_args()

    if args.raw_file:
        raw_path = args.raw_file
    else:
        countdown(args.delay)
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".fb")
        tmp.close()
        raw_path = tmp.name
        try:
            pull_framebuffer(raw_path)
        except RuntimeError as e:
            print(str(e), file=sys.stderr)
            sys.exit(1)

    with open(raw_path, "rb") as f:
        data = f.read()

    try:
        pixels = decode_framebuffer(data, args.width, args.height, args.bpp)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    img = Image.fromarray(pixels, "RGB")
    img.save(args.output)
    print(f"Saved {args.output} ({args.width}x{args.height}, {args.bpp}bpp, properly scaled)")

    if not args.raw_file:
        os.unlink(raw_path)


if __name__ == "__main__":
    main()
