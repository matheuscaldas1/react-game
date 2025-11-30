import { Scene } from "phaser";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    preload() {
        const keySvg = ({ text = null, icon = null }) => {
            const isEsc = text === "ESC";

            const fontSize = isEsc ? 16 : 26;
            const textY = isEsc ? 37 : 36;

            const arrowPath = (dir) => {
                switch (dir) {
                    case "up":
                        return "M32 16 L46 30 H38 V48 H26 V30 H18 Z";
                    case "down":
                        return "M32 48 L46 34 H38 V16 H26 V34 H18 Z";
                    case "left":
                        return "M16 32 L30 18 V26 H48 V38 H30 V46 Z";
                    case "right":
                        return "M48 32 L34 18 V26 H16 V38 H34 V46 Z";
                    default:
                        return "";
                }
            };

            return `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#DADADA"/>
    </linearGradient>
  </defs>

  <rect x="6" y="8" width="52" height="50" rx="10"
        fill="url(#g)" stroke="#121212" stroke-width="3"/>
  <rect x="9" y="11" width="46" height="44" rx="9"
        fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="2"/>

  ${
      icon
          ? `<path d="${arrowPath(icon)}" fill="#171717"/>`
          : `
        <text x="32" y="${textY}"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${fontSize}"
          font-weight="800"
          fill="#191919"
          text-anchor="middle"
          dominant-baseline="central"
          ${isEsc ? 'textLength="34" lengthAdjust="spacingAndGlyphs"' : ""}
        >${text}</text>
      `
  }
</svg>`.trim();
        };

        const toBase64DataUri = (svg) =>
            "data:image/svg+xml;base64," +
            btoa(unescape(encodeURIComponent(svg)));

        const loadKey = (key, opts) => {
            this.load.image(key, toBase64DataUri(keySvg(opts)));
        };

        loadKey("key_up", { icon: "up" });
        loadKey("key_down", { icon: "down" });
        loadKey("key_left", { icon: "left" });
        loadKey("key_right", { icon: "right" });

        loadKey("key_w", { text: "W" });
        loadKey("key_a", { text: "A" });
        loadKey("key_s", { text: "S" });
        loadKey("key_d", { text: "D" });

        loadKey("key_esc", { text: "ESC" });
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const cx = width / 2;
        const cy = height / 2;

        this.cameras.main.setBackgroundColor(0x2e2157);

        this.add.bitmapText(cx, cy, "arcade", "SynthRun", 25).setOrigin(0.5);

        this.add
            .bitmapText(cx, 250, "arcade", "Press SPACE or Click to start!", 15)
            .setOrigin(0.5);

        const panelW = Math.min(width * 0.92, 780);
        const panelH = 120;
        const panelY = height - 70;

        const hud = this.add.container(cx, panelY).setDepth(9999);

        hud.add(
            this.add
                .rectangle(0, 0, panelW, panelH, 0x000000, 0.18)
                .setOrigin(0.5)
        );

        hud.add(
            this.add
                .rectangle(0, 0, 2, panelH - 26, 0xffffff, 0.12)
                .setOrigin(0.5)
        );

        const leftCol = this.add.container(-panelW / 4, 0);
        const rightCol = this.add.container(panelW / 4, 0);
        hud.add([leftCol, rightCol]);

        // helpers
        const makeRow = (parent, y, keys, labelText) => {
            const row = this.add.container(0, y);

            const keyGap = 6;
            const labelGap = 10;

            const label = this.add
                .bitmapText(0, 0, "arcade", labelText, 12)
                .setOrigin(0, 0.5)
                .setAlpha(0.95);

            // largura útil de cada coluna (tipo flex 1 1)
            const colW = panelW * 0.5 - 60; // ajuste fino aqui se quiser mais/menos espaço

            // tamanho desejado e cálculo pra caber (row com 4 teclas é a mais “larga”)
            const desiredKeySize = 26; // fica bem na maioria das telas
            const maxKeySize =
                (colW - labelGap - label.width - (keys.length - 1) * keyGap) /
                keys.length;

            let keySize = Math.floor(Math.min(desiredKeySize, maxKeySize));
            keySize = Phaser.Math.Clamp(keySize, 16, desiredKeySize);

            const keysW = keys.length * keySize + (keys.length - 1) * keyGap;
            const totalW = keysW + labelGap + label.width;
            const startX = -totalW / 2;

            // adiciona keys (FORÇA tamanho visual pra não pegar 64x64 da textura)
            keys.forEach((k, i) => {
                const x = startX + keySize / 2 + i * (keySize + keyGap);
                const img = this.add
                    .image(x, 0, k)
                    .setOrigin(0.5)
                    .setDisplaySize(keySize, keySize); // <-- ESSENCIAL
                row.add(img);
            });

            // label
            label.x = startX + keysW + labelGap;
            row.add(label);

            parent.add(row);
            return row;
        };

        const makeTitle = (parent, y, text) => {
            parent.add(
                this.add
                    .bitmapText(0, y, "arcade", text, 12)
                    .setOrigin(0.5)
                    .setAlpha(0.95)
            );
        };

        // LEFT COLUMN (comandos)
        makeTitle(leftCol, -40, "COMANDOS");
        makeRow(leftCol, -14, ["key_up", "key_w"], "ACELERA");
        makeRow(leftCol, 14, ["key_down", "key_s"], "DESACELERA");
        makeRow(
            leftCol,
            42,
            ["key_left", "key_a", "key_right", "key_d"],
            "VIRA"
        );

        // RIGHT COLUMN (pause)
        makeTitle(rightCol, -40, "PAUSE");
        makeRow(rightCol, 8, ["key_esc"], "PRESS TO PAUSE");

        // Inputs
        this.input.keyboard.on("keydown-SPACE", this.startGame, this);
        this.input.on("pointerdown", () => this.startGame(), this);
    }

    startGame() {
        this.scene.start("Game");
    }
}
