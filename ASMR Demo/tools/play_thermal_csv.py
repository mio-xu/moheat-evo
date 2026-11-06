"""Play the ASMR mix and stream the 4-channel thermal CSV to MoHeat Evo (ESP32) over serial — no browser needed.

  pip3 install pyserial
  python3 tools/play_thermal_csv.py --list
  python3 tools/play_thermal_csv.py --port /dev/cu.usbserial-0001            # USB
  python3 tools/play_thermal_csv.py --port /dev/cu.MoHeatEvo                 # Bluetooth SPP
  python3 tools/play_thermal_csv.py --port ... --intensity 0.7 --offset 0.1  # gentler, 100 ms extra lead
  python3 tools/play_thermal_csv.py --port ... --dry-run                     # print commands only

Protocol (firmware arduino/MoHeatEvoArduino.ino, 115200 baud, one line per command):
  "LC<35..80> RH<0..200>"  per ear: C = cooling, H = heating; writing one mode clears the other on that ear
  "stop"                    everything off
Safety: Ctrl-C, the end of the file, or any error sends "stop". Commands are sent ≤ 10×/s and only on change.
"""
import argparse, csv, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW_MAX = {"cool": 80, "heat": 200}


def load(path):
    with open(path) as f:
        r = csv.DictReader(f)
        return [(float(x["time_s"]), float(x["L_cool"]), float(x["R_cool"]), float(x["L_heat"]), float(x["R_heat"])) for x in r]


def command(lc, rc, lh, rh, a):
    def part(side, c, h):
        if c > 0.03: return f"{side}C{round(a.cool_min + c * (a.cool_max - a.cool_min))}"
        if h > 0.03: return f"{side}H{round(a.heat_min + h * (a.heat_max - a.heat_min))}"
        return f"{side}H0"
    if max(lc, rc, lh, rh) <= 0.03: return "stop"
    return f"{part('L', lc, lh)} {part('R', rc, rh)}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port"); ap.add_argument("--list", action="store_true")
    ap.add_argument("--csv", default=os.path.join(ROOT, "media", "thermal.csv"))
    ap.add_argument("--audio", default=os.path.join(ROOT, "output", "mix_48k.wav"))
    ap.add_argument("--no-audio", action="store_true")
    ap.add_argument("--intensity", type=float, default=1.0, help="0..1 global scale")
    ap.add_argument("--offset", type=float, default=0.0, help="extra device lead in seconds (CSV already includes cool 0.35 s / heat 0.60 s)")
    ap.add_argument("--cool-min", type=int, default=35); ap.add_argument("--cool-max", type=int, default=80)
    ap.add_argument("--heat-min", type=int, default=0); ap.add_argument("--heat-max", type=int, default=200)
    ap.add_argument("--start", type=float, default=0.0, help="start at this time (s)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    if a.cool_max > FW_MAX["cool"] or a.heat_max > FW_MAX["heat"]:
        sys.exit(f"Refusing: max above firmware limits (cool {FW_MAX['cool']}, heat {FW_MAX['heat']}).")
    a.intensity = max(0.0, min(1.0, a.intensity))

    ser = None
    if a.list or not a.dry_run:
        try:
            import serial, serial.tools.list_ports
        except ImportError:
            sys.exit("pyserial missing:  pip3 install pyserial")
        if a.list:
            for p in serial.tools.list_ports.comports(): print(p.device, "—", p.description)
            return
        if not a.port: sys.exit("--port required (see --list), or use --dry-run")
        ser = serial.Serial(a.port, 115200, timeout=0, dsrdtr=False, rtscts=False)
        ser.dtr = False; ser.rts = False          # keep the ESP32 out of reset
        time.sleep(0.3)

    def send(line):
        if ser: ser.write((line + "\n").encode())
        print(f"{line}")

    rows = load(a.csv)
    rate = 1 / (rows[1][0] - rows[0][0])
    player = None
    try:
        if not a.no_audio and os.path.exists(a.audio):
            player = subprocess.Popen(["afplay", "-t", "9999", a.audio] if a.start == 0 else ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-ss", str(a.start), a.audio])
        t0 = time.perf_counter() - a.start
        last, last_at = "", 0.0
        while True:
            t = time.perf_counter() - t0
            i = int((t + a.offset) * rate)
            if i >= len(rows): break
            _, lc, rc, lh, rh = rows[max(0, i)]
            cmd = command(lc * a.intensity, rc * a.intensity, lh * a.intensity, rh * a.intensity, a)
            if cmd != last and time.perf_counter() - last_at >= 0.1:
                print(f"{t:7.2f}s  ", end=""); send(cmd); last, last_at = cmd, time.perf_counter()
            if ser and ser.in_waiting: ser.read(ser.in_waiting)
            time.sleep(0.01)
    except KeyboardInterrupt:
        print("\nEMERGENCY STOP")
    finally:
        send("stop")
        if player: player.terminate()
        if ser: time.sleep(0.05); ser.close()


if __name__ == "__main__":
    main()
