// =====================================================================
// settings.js — player-facing Settings panel (gear button). Surfaces the
// master volume slider, a mute toggle, and a theme picker (promoting the old
// debug-only theme switch). Changes are persisted by the caller via the
// handlers (see main.js -> persist.js). All Pixi, no DOM.
// =====================================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { THEME_NAMES } from './config.js';
import { audio } from './audio.js';
import { makeModalShell } from './overlay.js';

function label(text, size, fill, weight = '800') {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: size,
      fontWeight: weight,
      fill,
      align: 'left',
    }),
  });
}

const clamp01 = (t) => Math.max(0, Math.min(1, t));

export class SettingsPanel {
  constructor(app, world, handlers) {
    this.app = app;
    this.handlers = handlers; // { onVolume, onMute, onTheme, getState }
    this.shell = makeModalShell({ title: 'SETTINGS', width: 780, height: 720 });
    world.addChild(this.shell.root);
    this._build();
  }

  get isOpen() {
    return this.shell.isOpen;
  }

  _build() {
    const content = this.shell.content;
    const pad = 56;
    const innerW = this.shell.width - pad * 2;

    content.addChild(label('VOLUME', 30, 0xffffff));
    this.volPct = label('50%', 30, 0xffe08a);
    this.volPct.anchor.set(1, 0);
    this.volPct.position.set(pad + innerW, 0);
    content.addChild(this.volPct);
    this._buildSlider(pad, 64, innerW, content);

    content.addChild(this._positioned(label('SOUND', 30, 0xffffff), pad, 150));
    this.mutePill = this._pill('ON', pad + 160, 142, 180, (/* */) => {
      audio.uiClick();
      this.handlers.onMute();
    });
    content.addChild(this.mutePill);

    content.addChild(this._positioned(label('THEME', 30, 0xffffff), pad, 270));
    this.themeChips = {};
    const chipW = 150;
    const gap = 12;
    let x = pad;
    let y = 326;
    for (const name of THEME_NAMES) {
      if (x + chipW > pad + innerW) {
        x = pad;
        y += 84;
      }
      const chip = this._pill(name.toUpperCase(), x, y, chipW, () => {
        audio.uiClick();
        this.handlers.onTheme(name);
        this._highlightTheme(name);
      });
      this.themeChips[name] = chip;
      content.addChild(chip);
      x += chipW + gap;
    }
  }

  _positioned(node, x, y) {
    node.position.set(x, y);
    return node;
  }

  _buildSlider(x, y, w, content) {
    const trackH = 12;
    const track = new Graphics();
    track.eventMode = 'static';
    track.cursor = 'pointer';
    content.addChild(track);
    const fill = new Graphics();
    content.addChild(fill);
    const knob = new Container();
    knob.eventMode = 'static';
    knob.cursor = 'pointer';
    const kg = new Graphics()
      .circle(0, 0, 22)
      .fill({ color: 0xffe08a })
      .stroke({ color: 0x5a3a00, width: 3 });
    knob.addChild(kg);
    knob.y = y + trackH / 2;
    content.addChild(knob);

    const redraw = (t) => {
      track.clear();
      track.roundRect(x, y, w, trackH, 6).fill({ color: 0x223052 });
      fill.clear();
      fill.roundRect(x, y, w * t, trackH, 6).fill({ color: 0xc69a3a });
      knob.x = x + w * t;
      this.volPct.text = `${Math.round(t * 100)}%`;
    };
    this._setSlider = redraw;

    const apply = (e) => {
      const p = content.toLocal(e.global); // letterbox-safe: map through the card
      const t = clamp01((p.x - x) / w);
      redraw(t);
      this.handlers.onVolume(t);
    };

    // Pixi v8: plain `pointermove` only fires while the pointer is over an
    // interactive object — drags must use `globalpointermove` on the stage.
    // Listeners are attached on drag-start and removed on drag-end so nothing
    // lingers on the stage between drags.
    const stage = this.app.stage;
    const endDrag = () => {
      stage.off('globalpointermove', apply);
      stage.off('pointerup', endDrag);
      stage.off('pointerupoutside', endDrag);
    };
    knob.on('pointerdown', () => {
      stage.on('globalpointermove', apply);
      stage.on('pointerup', endDrag);
      stage.on('pointerupoutside', endDrag);
    });
    track.on('pointertap', apply);

    redraw(0.5);
  }

  _pill(text, x, y, w, onTap) {
    const c = new Container();
    c.position.set(x, y);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    const bg = new Graphics();
    c.addChild(bg);
    const t = label(text, 26, 0xffffff, '800');
    t.anchor.set(0.5);
    t.position.set(w / 2, 30);
    c.addChild(t);
    c._w = w;
    c._label = t;
    c._active = false;
    const draw = () => {
      bg.clear();
      bg.roundRect(0, 0, w, 60, 14)
        .fill({ color: c._active ? 0x6e3a1a : 0x16213e })
        .stroke({ color: c._active ? 0xd14a2a : 0x3a4a72, width: 2 });
    };
    c._draw = draw;
    draw();
    c.on('pointerdown', () => c.scale.set(0.96));
    c.on('pointerup', () => c.scale.set(1));
    c.on('pointerupoutside', () => c.scale.set(1));
    c.on('pointertap', onTap);
    return c;
  }

  _setActive(pill, on) {
    pill._active = on;
    pill._draw();
  }

  _highlightTheme(name) {
    for (const [k, chip] of Object.entries(this.themeChips)) this._setActive(chip, k === name);
  }

  // Pull current state from the host and reflect it in the widgets.
  open() {
    const st = this.handlers.getState();
    this._setSlider(clamp01(st.volume));
    this.mutePill._label.text = st.muted ? 'MUTED' : 'ON';
    this._setActive(this.mutePill, st.muted);
    this._highlightTheme(st.theme);
    this.shell.open();
  }

  close() {
    this.shell.close();
  }

  // keep the panel in sync if mute/theme change from outside (HUD SOUND, debug)
  syncMuted(muted) {
    if (!this.mutePill) return;
    this.mutePill._label.text = muted ? 'MUTED' : 'ON';
    this._setActive(this.mutePill, muted);
  }

  syncTheme(name) {
    this._highlightTheme(name);
  }
}
