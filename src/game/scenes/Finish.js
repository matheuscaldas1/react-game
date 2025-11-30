import { Scene } from "phaser";

export class Finish extends Scene {
    constructor() {
        super("Finish");
    }

    init(data) {
        this.remainingTime =
            (data && typeof data.remainingTime === "number"
                ? data.remainingTime
                : null) ??
            this.registry.get("remainingTime") ??
            0;
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;
        const cx = width / 2;

        this.cameras.main.setBackgroundColor(0x0b1020);

        this.add.bitmapText(cx, 70, "arcade", "YOU WIN", 52).setOrigin(0.5);
        this.add
            .bitmapText(cx, 125, "arcade", "CONGRATULATIONS", 22)
            .setOrigin(0.5);

        this.add
            .bitmapText(
                cx,
                180,
                "arcade",
                `remaining time: ${this.remainingTime}`,
                20
            )
            .setOrigin(0.5);

        const devTimes = [
            { name: "Matheus Dev", time: 48 },
            { name: "Nathan Dev", time: 50 },
            { name: "Sthanley Dev", time: 44 },
        ];

        const you = { name: "YOU", time: this.remainingTime, isYou: true };

        const ordinal = (n) => {
            if (n === 1) return "1ST";
            if (n === 2) return "2ND";
            if (n === 3) return "3RD";
            return `${n}TH`;
        };

        // Ranking: maior remaining time = melhor
        // Devs SEMPRE entram na lista; se algum time estiver null/undefined, ele cai pro final.
        const entries = [...devTimes.map((d) => ({ ...d, isYou: false })), you];

        const ranked = entries
            .map((e) => ({
                ...e,
                sortKey:
                    typeof e.time === "number" && isFinite(e.time)
                        ? e.time
                        : -Infinity,
            }))
            .sort((a, b) => b.sortKey - a.sortKey);

        const youPos = ranked.findIndex((x) => x.isYou) + 1;

        this.add
            .bitmapText(
                cx,
                225,
                "arcade",
                `YOU ARE IN ${ordinal(youPos)} PLACE!`,
                18
            )
            .setOrigin(0.5);

        this.add
            .bitmapText(cx, 270, "arcade", "LEADERBOARD", 22)
            .setOrigin(0.5);

        const startY = 320;
        const lineGap = 40;

        // Sempre renderiza 4 linhas (3 devs + YOU)
        ranked.forEach((r, i) => {
            const t =
                typeof r.time === "number" && isFinite(r.time)
                    ? String(r.time)
                    : " ";

            const line = `${i + 1}. ${r.name}: remaining time : ${t}`;

            const txt = this.add
                .bitmapText(cx, startY + i * lineGap, "arcade", line, 18)
                .setOrigin(0.5);

            if (r.isYou) txt.setTint(0xffd54a);
        });

        this.add
            .bitmapText(
                cx,
                height - 90,
                "arcade",
                "Press SPACE or Click to restart!",
                16
            )
            .setOrigin(0.5);

        this.input.keyboard.on("keydown-SPACE", () => this.startGame());
        this.input.on("pointerdown", () => this.startGame());
    }

    startGame() {
        this.scene.stop("GameOver");
        this.scene.stop("Finish");
        this.scene.start("Game");
    }
}
