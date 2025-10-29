import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.audio("coin", "assets/sounds/coin.wav")
        this.load.audio("jump", "assets/sounds/jump.wav")
        this.load.audio("dead", "assets/sounds/dead.wav")
        this.load.audio("theme", "assets/sounds/theme.wav")
        this.load.spritesheet("coin", "./assets/coin.png", {
            frameWidth: 32,
            frameHeight: 32,
        })
        this.load.bitmapFont(
            "arcade",
            "assets/fonts/arcade.png",
            "assets/fonts/arcade.xml"
        );
    }

    create() {
        this.scene.start('Preloader');
    }
}
