import { Scene } from "phaser";
import { EventBus } from "../../EventBus";

export class Pause extends Scene {
    constructor() {
        super("Pause");
    }

    create() {
        this.width = this.sys.game.config.width;
        this.height = this.sys.game.config.height;
        this.center_width = this.width / 2;
        this.center_height = this.height / 2;

        const overlay = this.add.rectangle(
            this.center_width,
            this.center_height,
            this.width,
            this.height,
            0x000000,
            0.6
        );
        overlay.setScrollFactor(0);
        overlay.setInteractive();
        this.add
            .bitmapText(
                this.center_width,
                this.center_height - 90,
                "arcade",
                "JOGO PAUSADO",
                30
            )
            .setOrigin(0.5);

        this.add
            .bitmapText(
                this.center_width,
                this.center_height - 40,
                "arcade",
                "ESC / P para continuar",
                16
            )
            .setOrigin(0.5);

        const resumeText = this.add
            .bitmapText(
                this.center_width,
                this.center_height + 10,
                "arcade",
                "[ CONTINUAR ]",
                18
            )
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const restartText = this.add
            .bitmapText(
                this.center_width,
                this.center_height + 50,
                "arcade",
                "REINICIAR FASE",
                18
            )
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const menuText = this.add
            .bitmapText(
                this.center_width,
                this.center_height + 90,
                "arcade",
                "VOLTAR AO MENU",
                18
            )
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const makeHover = (target) => {
            target.on("pointerover", () => target.setTint(0xffff00));
            target.on("pointerout", () => target.clearTint());
        };

        makeHover(resumeText);
        makeHover(restartText);
        makeHover(menuText);

        resumeText.on("pointerup", () => this.resumeGame());
        restartText.on("pointerup", () => this.restartGame());
        menuText.on("pointerup", () => this.backToMenu());

        this.input.keyboard.once("keydown-ESC", () => this.resumeGame());
        this.input.keyboard.once("keydown-P", () => this.resumeGame());

        overlay.once("pointerdown", () => this.resumeGame());

        EventBus.emit("pause-opened");
        EventBus.emit("current-scene-ready", this);
    }

    resumeGame() {
        EventBus.emit("pause-closed");

        this.scene.stop("Pause");
        this.scene.resume("Game");
    }

    restartGame() {
        EventBus.emit("pause-closed");

        this.sound.remove('backgroundMusic');
        this.scene.stop("Game");
        this.scene.stop("Pause");
        this.scene.start("Game");
    }

    backToMenu() {
        EventBus.emit("pause-closed");

        this.scene.stop("Game");
        this.scene.stop("Pause");
        this.scene.start("MainMenu");
    }
}
