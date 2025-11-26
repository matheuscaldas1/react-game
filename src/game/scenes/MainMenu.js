import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class MainMenu extends Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        this.width = this.sys.game.config.width;
        this.height = this.sys.game.config.height;
        this.center_width = this.width / 2;
        this.center_height = this.height / 2;

        this.cameras.main.setBackgroundColor(0x2E2157);

        this.add
            .bitmapText(
                this.center_width,
                this.center_height,
                "arcade",
                "SynthRun",
                25
            )
            .setOrigin(0.5);

        this.add
            .bitmapText(
                this.center_width,
                250,
                "arcade",
                "Press SPACE or Click to start!",
                15
            )
            .setOrigin(0.5);

        this.input.keyboard.on("keydown-SPACE", this.startGame, this);
        this.input.on("pointerdown", (pointer) => this.startGame(), this);
    }

    startGame() {
        this.scene.start('Game');
    }
}
