import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.audio("theme", "assets/sounds/theme.wav")
        this.load.image("player_straight", "./assets/Player/player_straight.png")
        this.load.image("player_left", "./assets/Player/player_left.png")
        this.load.image("player_right", "./assets/Player/player_right.png")
        this.load.image("player_uphill_left", "./assets/Player/player_uphill_left.png")
        this.load.image("player_uphill_right", "./assets/Player/player_uphill_right.png")
        this.load.image("player_uphill_straight", "./assets/Player/player_uphill_straight.png")
        this.load.image("one", "./assets/Background/one.png")
        this.load.image("two", "./assets/Background/two.png")
        this.load.image("three", "./assets/Background/three.png")
        this.load.image("four", "./assets/Background/four.png")
        this.load.image("five", "./assets/Background/five.png")
        this.load.image("six", "./assets/Background/six.png")
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
