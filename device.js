// Shared Web Serial connection for the MoHeat Evo pages (control.html, test.html).
// Lists authorized ports, refreshes on plug/unplug, opens at 115200 baud, writes lines in order and logs replies.
window.MoHeatDevice = (() => {
  const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';   // Bluetooth Serial Port Profile
  const VENDORS = { 0x10c4: 'Silicon Labs CP210x', 0x1a86: 'WCH CH340', 0x303a: 'Espressif', 0x0403: 'FTDI', 0x2341: 'Arduino' };
  const supported = 'serial' in navigator;

  const portLabel = (p, i) => {
    const info = p.getInfo();
    if (info.bluetoothServiceClassId) return `#${i + 1} Bluetooth serial`;
    if (info.usbVendorId != null) {
      const hex = (n) => n.toString(16).padStart(4, '0');
      return `#${i + 1} ${VENDORS[info.usbVendorId] || 'USB serial'} (${hex(info.usbVendorId)}:${hex(info.usbProductId)})`;
    }
    return `#${i + 1} Serial port`;
  };
  const setStatus = (el, text, cls = '') => { if (!el) return; el.className = `status ${cls}`; (el.querySelector('span') || el).textContent = text; };
  // ONE source of truth for the connection (user 2026-11-09: the menu, ⚙, info strip, kiosk panel and queue screen must always agree):
  // MoHeatDevice.state = { state: 'off' | 'reconnecting' | 'connecting' | 'connected' | 'lost' | 'error', connected, name, error } and the
  // window event 'moheat:device' (detail = that object) on every change. Every surface listens; none keeps its own copy.
  const LS = { get: (k) => { try { return localStorage.getItem('moheat.device.' + k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem('moheat.device.' + k) : localStorage.setItem('moheat.device.' + k, v); } catch {} } };
  const emit = (state, extra = {}) => { api.state = { state, connected: state === 'connected', name: api.state?.name || '', error: '', ...extra };
    dispatchEvent(new CustomEvent('moheat:device', { detail: api.state })); };

  // ui: { select, addBtn, connectBtn, status }  hooks: { log, onConnect, onDisconnect }
  function create(ui, hooks = {}) {
    const log = hooks.log || (() => {});
    const enc = new TextEncoder();
    let ports = [], port = null, writer = null, reader = null, readClosed = null, chain = Promise.resolve();

    async function refresh(prefer) {
      if (!supported) return;
      const keep = prefer || ports[ui.select.selectedIndex];
      ports = await navigator.serial.getPorts();
      ui.select.innerHTML = '';
      if (!ports.length) {
        ui.select.add(new Option('No device — + Add', ''));
        ui.select.disabled = true;
      } else {
        ports.forEach((p, i) => ui.select.add(new Option(portLabel(p, i) + (p === port ? ' — connected' : ''), i)));
        ui.select.disabled = !!port;
        const idx = ports.indexOf(keep);
        if (idx >= 0) ui.select.selectedIndex = idx;
      }
      ui.connectBtn.disabled = !port && !ports.length;
    }

    const send = (line) => {
      if (!writer) return chain;
      chain = chain.then(() => writer.write(enc.encode(line + '\n'))).then(() => log(`→ ${line}`)).catch((e) => { log(`! write failed: ${e.message}`); if (port && /lost|disconnect|NetworkError/i.test(`${e.name} ${e.message}`)) disconnect(true); });   // unplugged: say so, stop writing
      return chain;
    };

    async function readLoop() {
      const decoder = new TextDecoderStream();
      readClosed = port.readable.pipeTo(decoder.writable).catch(() => {});
      reader = decoder.readable.getReader();
      let buf = '';
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          let n;
          while ((n = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, n).trim(); buf = buf.slice(n + 1);
            if (line) log(`← ${line}`);
          }
        }
      } catch (e) { if (port && !port.__closing && /lost|disconnect|NetworkError/i.test(`${e?.name} ${e?.message}`)) disconnect(true); }   // the device went away while reading
    }

    async function connect(auto = false) {
      const p = ports[ui.select.selectedIndex];
      if (!p) return;
      ui.connectBtn.disabled = true;
      setStatus(ui.status, auto ? 'Reconnecting…' : 'Connecting…', 'busy'); emit(auto ? 'reconnecting' : 'connecting', { name: portLabel(p, ports.indexOf(p)) });
      try {
        await p.open({ baudRate: 115200 });
        // Keep the ESP32 out of reset/boot mode on boards with auto-reset wiring.
        await p.setSignals({ dataTerminalReady: false, requestToSend: false }).catch(() => {});
        port = p; p.__closing = false;
        if (!p.__mhLost) { p.__mhLost = true; p.addEventListener?.('disconnect', () => { if (port === p) disconnect(true); }); }   // the port's own event as well as navigator.serial's
        writer = port.writable.getWriter();
        readLoop();
        setStatus(ui.status, 'Connected', 'ok');
        log(`connected · ${portLabel(p, ports.indexOf(p))}`);
        ui.connectBtn.textContent = 'Disconnect';
        ui.connectBtn.classList.add('is-on');
        LS.set('auto', '1'); LS.set('port', String(ports.indexOf(p)));   // switching demos reconnects to this port without asking
        emit('connected', { name: portLabel(p, ports.indexOf(p)) });
        hooks.onConnect?.();
      } catch (e) {
        setStatus(ui.status, `Could not open: ${e.message}`, 'err');
        port = null; emit('error', { error: e.message });
      }
      ui.connectBtn.disabled = false;
      refresh(p);
    }

    async function disconnect(lost = false) {
      const p = port;
      if (!p || p.__closing) return;
      p.__closing = true; const w = writer; if (lost) writer = null;   // lost: nothing more is written, isConnected() is false at once
      if (!lost) await send('stop');
      try { await chain; } catch {}
      try { await reader?.cancel(); } catch {}
      try { await readClosed; } catch {}
      try { w?.releaseLock(); } catch {}
      try { if (!lost) await p.close(); } catch {}
      port = writer = reader = null;
      ui.connectBtn.textContent = 'Connect';
      ui.connectBtn.classList.remove('is-on');
      setStatus(ui.status, lost ? 'Device disconnected' : 'Not connected', lost ? 'err' : '');
      if (!lost) LS.set('auto', null); emit(lost ? 'lost' : 'off');
      log(lost ? 'device lost' : 'disconnected');
      hooks.onDisconnect?.(lost);
      refresh(p);
    }

    if (supported) {
      ui.addBtn.addEventListener('click', async () => {
        try { await refresh(await navigator.serial.requestPort({ allowedBluetoothServiceClassIds: [SPP_UUID] })); }
        catch { /* picker dismissed */ }
      });
      ui.connectBtn.addEventListener('click', () => (port ? disconnect() : connect()));
      // silent reconnect to the port granted before (no prompt): on page load (switching demos) and when it is plugged back in
      const auto = async () => { if (port || LS.get('auto') !== '1') return; await refresh(); const i = +LS.get('port') || 0; if (!ports.length) return;
        ui.select.selectedIndex = Math.min(i, ports.length - 1); await connect(true); };
      navigator.serial.addEventListener('connect', () => { refresh().then(auto); });
      navigator.serial.addEventListener('disconnect', (e) => { if (e.target === port || e.port === port) disconnect(true); else refresh(); });
      setTimeout(auto, 0);
      // Best effort: turn the outputs off when the page goes away.
      addEventListener('pagehide', () => { if (writer) writer.write(enc.encode('stop\n')).catch(() => {}); });
      refresh();
    } else {
      ui.addBtn.disabled = ui.connectBtn.disabled = true;
    }

    const inst = { send, isConnected: () => !!writer, connect: () => (port ? Promise.resolve() : connect()), disconnect: () => disconnect(), get name() { return api.state?.name || ''; } };
    api.current = inst;   // the page's device, for shared tools such as demos/shared/thermocheck.js (left / right · warm / cool check)
    return inst;
  }

  // visitor option "warm only (no mist)" (exhibition, user 2026-11-11): some visitors dislike the alcohol mist. While localStorage
  // 'moheat.warmOnly' is '1' every cool value is 0 at this one send point (old form LC50 → LC0, DUAL LC / RC → 0; heat, stop and the
  // 1 s rules untouched). The kiosk clears it for the next visitor; the staff device test (devtest.html) always sends what it is told.
  const warmOnly = () => { try { return localStorage.getItem('moheat.warmOnly') === '1' && !/devtest\.html$/.test(location.pathname); } catch { return false; } };
  const coolOff = (line) => (warmOnly() ? String(line).replace(/\b([LR])C\d+/g, '$1C0') : line);
  const createWO = (ui, hooks) => { const inst = create(ui, hooks), send = inst.send; inst.send = (line) => send.call(inst, coolOff(line)); api.current = inst; return inst; };
  const api = { create: createWO, warmOnly, supported, current: null, state: { state: 'off', connected: false, name: '', error: '' } };
  return api;
})();
