#!/usr/bin/env python3
"""Drives the interactive CLI through a pseudo-terminal (stdlib only).

    python3 scripts/interactive-check.py [path/to/cli entry]

A. accept every default and finish (no install)
B. Ctrl+C at the first prompt: exit 130, nothing written
C. Ctrl+C while installing: exit 130, the new project is removed
"""
import fcntl, os, pty, re, select, shutil, signal, struct, sys, tempfile, termios, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "src", "index.ts")
ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
NODE = shutil.which("node")


def spawn(cwd, args):
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(cwd)
        os.execv(NODE, [NODE, ENTRY, *args])
    # A real terminal size; with 0 columns every character wraps.
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 40, 140, 0, 0))
    return pid, fd


def read_until(fd, pattern, timeout=60):
    buf, end = "", time.time() + timeout
    while time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.2)
        if r:
            try:
                chunk = os.read(fd, 4096).decode(errors="replace")
            except OSError:
                break
            buf += ANSI.sub("", chunk)
            if re.search(pattern, buf):
                return buf
    raise TimeoutError(f"waiting for {pattern!r}; got:\n{buf[-800:]}")


def wait(pid, fd, timeout=120):
    end = time.time() + timeout
    while time.time() < end:
        try:
            os.read(fd, 4096)
        except OSError:
            pass
        done, status = os.waitpid(pid, os.WNOHANG)
        if done:
            return os.waitstatus_to_exitcode(status)
        time.sleep(0.1)
    os.kill(pid, signal.SIGKILL)
    raise TimeoutError("process did not exit")


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    return ok


results = []

# A: accept all defaults
with tempfile.TemporaryDirectory() as cwd:
    pid, fd = spawn(cwd, ["--no-install", "--no-git"])
    for prompt in ["Project structure", "Project name", "Package manager", "Project preset", "Customize", "Example code", "Save this configuration", "Create the project"]:
        read_until(fd, prompt)
        time.sleep(0.15)
        os.write(fd, b"\r")
    code = wait(pid, fd)
    results.append(check("A: defaults complete with exit 0", code == 0, f"exit {code}"))
    results.append(check("A: project written", os.path.exists(os.path.join(cwd, "my-app", "package.json"))))

# B: cancel at the first prompt
with tempfile.TemporaryDirectory() as cwd:
    pid, fd = spawn(cwd, [])
    read_until(fd, "Project structure")
    os.write(fd, b"\x03")
    code = wait(pid, fd)
    results.append(check("B: Ctrl+C at a prompt exits 130", code == 130, f"exit {code}"))
    results.append(check("B: nothing written", os.listdir(cwd) == [], str(os.listdir(cwd))))

# C: cancel during install (real pnpm install)
with tempfile.TemporaryDirectory() as cwd:
    pid, fd = spawn(cwd, ["cancel-me", "--mode", "standalone", "--package-manager", "pnpm", "--preset", "minimal", "--no-git"])
    for prompt in ["Customize", "Example code", "Save this configuration", "Create the project"]:
        read_until(fd, prompt)
        time.sleep(0.15)
        os.write(fd, b"\r")
    read_until(fd, "Installing dependencies", timeout=60)
    time.sleep(1.0)
    os.write(fd, b"\x03")
    code = wait(pid, fd)
    results.append(check("C: Ctrl+C during install exits 130", code == 130, f"exit {code}"))
    results.append(check("C: new project rolled back", not os.path.exists(os.path.join(cwd, "cancel-me")), str(os.listdir(cwd))))

sys.exit(0 if all(results) else 1)
