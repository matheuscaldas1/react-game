import { EventBus } from "../EventBus";
import { Scene } from "phaser";
import RoadSegment from "../gameObjects/RoadSegment";
import Camera from "../gameObjects/Camera";
import Player from "../gameObjects/player";
import Background from "../gameObjects/Background";

export class Game extends Scene {
    constructor() {
        super("Game");
    }

    create() {
        this.gameState = {
            player: {
                speed: 0,
                position: 0.5, // 0-1 across road width
                sprite: null,
            },
            road: {
                segment: 0,
                curve: 0,
                elevation: 0,
            },
        };

        this.keys = this.input.keyboard.addKeys({
            up: "W",
            down: "S",
            left: "A",
            right: "D",
            upArrow: "UP",
            downArrow: "DOWN",
            leftArrow: "LEFT",
            rightArrow: "RIGHT",
        });

        // ESC para Pausar
        this.input.keyboard.on("keydown-ESC", () => {
            if (this.scene.isActive("Pause")) return;

            this.scene.launch("Pause");
            this.scene.pause();
        });

        this.graphics = this.add.graphics();
        this.roadPlan = [
            { curve: 0.0, length: 100, elevation: 0 },
            { curve: 0.0, length: 100, elevation: -0.1 },
            { curve: 0.0, length: 100, elevation: 0.1 }, // reta inicial
            { curve: 0.6, length: 150, elevation: 0 }, // curva direita
            { curve: -0.5, length: 100, elevation: 0 }, // curva esquerda
            { curve: 0.0, length: 300, elevation: 0 }, // reta longa
            { curve: 0.4, length: 120, elevation: 0 }, // curva direita leve
            { curve: 0.0, length: 200, elevation: 0 }, // reta final
        ];
        this.segments = this.buildRoad(this.roadPlan);

        this.speed = 0;
        this.lateralOffset = 0;

        this.camera = new Camera({
            screenWidth: 800,
            screenHeight: 600,
            roadWidth: 2000,
            depth: 0.8,
        });

        this.playerLogic = new Player();

        this.player = this.add.sprite(
            this.camera.screenWidth / 2,
            450,
            "player_straight"
        );
        this.player.setOrigin(0.5, 1);

        // ======== background =========
        const one = this.textures.get("one");
        const two = this.textures.get("two");
        const three = this.textures.get("three");
        const four = this.textures.get("four");
        const five = this.textures.get("five");
        const six = this.textures.get("six");

        this.background = new Background(one, two, three, four, five, six);
        const w = this.game.config.width;
        const h = this.game.config.height;

        this.bgOne = this.add
            .tileSprite(0, 0, w, h, "one")
            .setOrigin(0, 0)
            .setScrollFactor(0);
        this.bgTwo = this.add
            .tileSprite(0, 0, w, h, "two")
            .setOrigin(0, 0)
            .setScrollFactor(0);
        this.bgTrees = this.add
            .tileSprite(0, 0, w, h, "three")
            .setOrigin(0, 0)
            .setScrollFactor(0);
        this.bgFour = this.add
            .tileSprite(0, 0, w, h, "four")
            .setOrigin(0, 0)
            .setScrollFactor(0);
        this.bgFive = this.add
            .tileSprite(0, 0, w, h, "five")
            .setOrigin(0, 0)
            .setScrollFactor(0);
        this.bgSix = this.add
            .tileSprite(0, 0, w, h, "six")
            .setOrigin(0, 0)
            .setScrollFactor(0);

        this.bgOne.setDepth(-6);
        this.bgTwo.setDepth(-5);
        this.bgTrees.setDepth(-4);
        this.bgFour.setDepth(-3);
        this.bgFive.setDepth(-2);
        this.bgSix.setDepth(-1);

        // === TIMER STYLE "OUTRUN" ===
        this.timeTotal = 30000;
        this.timeRemaining = this.timeTotal;
        this.timeDisplay = 0;

        this.timerText = this.add.text(650, 20, "TIME: 10", {
            fontFamily: "Arial",
            fontSize: "32px",
            fontStyle: "bold",
            color: "#fff",
        });
        this.timerText.setDepth(1000);

    }

    update(time, delta) {
        this.timeRemaining -= delta;

        const newDisplay = Math.max(0, Math.floor(this.timeRemaining / 1000));

        if (newDisplay !== this.timeDisplay) {
            this.timeDisplay = newDisplay;
            this.timerText.setText(`TIME: ${this.timeDisplay}`);

            // efeito pulse igual arcade
            this.timerText.setScale(1.25);
            this.tweens.add({
                targets: this.timerText,
                scale: 1,
                duration: 120,
                ease: "Quad.easeOut"
            });

            if (this.timeDisplay <= 0) {
                this.handleTimeUp();
            }
        }


        const curve = this.gameState.road.curve || 0;
        const camX = this.camera.x || 0;

        this.bgOne.tilePositionX = camX * 5 * 0.02;
        this.bgTwo.tilePositionX = camX * 10 * 0.06;
        this.bgTrees.tilePositionX = camX * 20 * 0.12;
        this.bgFour.tilePositionX = camX * 20 * 0.18;
        this.bgFive.tilePositionX = camX * 20 * 0.24;
        this.bgSix.tilePositionX = camX * 20 * 0.3;

        const inputState = {
            up: this.keys.up.isDown || this.keys.upArrow.isDown,
            down: this.keys.down.isDown || this.keys.downArrow.isDown,
            left: this.keys.left.isDown || this.keys.leftArrow.isDown,
            right: this.keys.right.isDown || this.keys.rightArrow.isDown,
        };

        const baseSegmentIndex = Math.floor(this.camera.z / this.segmentLength);
        const currentSegment = this.segments[baseSegmentIndex];

        // ===== CHECKPOINT DETECTION =====
        if (currentSegment && currentSegment.isCheckpoint && !currentSegment.checkpointHit) {
            currentSegment.checkpointHit = true;
            this.addTime(10); // +10 segundos
            this.showCheckpointMessage("+10s");
        }

        // MOVIMENTO
        this.playerLogic.update(
            inputState,
            currentSegment,
            this.game.loop.delta
        );
        this.camera.moveZ(this.playerLogic.speed);

        if (inputState.left) this.camera.moveX(-0.02);
        if (inputState.right) this.camera.moveX(0.02);

        // --- RENDERING ---
        this.graphics.clear();

        const maxDraw = Math.min(300, this.segments.length);
        let x = 0;
        let dx = 0;

        for (let n = 0; n < maxDraw; n++) {
            const segmentIndex = (baseSegmentIndex + n) % this.segments.length;
            const segment = this.segments[segmentIndex];

            if (!segment) {
                console.warn("segment undefined at index", segmentIndex);
                continue;
            }
            if (!segment.p1 || !segment.p2) {
                console.warn("segment missing p1/p2", segmentIndex, segment);
                continue;
            }

            dx += segment.curve || 0;
            x += dx;
            segment.p1.world.x = x;
            segment.p2.world.x = x;

            if (!segment.p1.screen) segment.p1.screen = { x: 0, y: 0, w: 0 };
            if (!segment.p2.screen) segment.p2.screen = { x: 0, y: 0, w: 0 };

            this.camera.projectPoint(segment.p1);
            this.camera.projectPoint(segment.p2);

            if (
                !segment.p1.screen ||
                !segment.p2.screen ||
                !isFinite(segment.p1.screen.y) ||
                !isFinite(segment.p2.screen.y)
            ) {
                console.warn(
                    "segment screen inválido",
                    segmentIndex,
                    segment.p1.screen,
                    segment.p2.screen
                );
                continue;
            }

            segment.p1.index = segment.index;
            segment.p2.index = segment.index;

            drawSegment(
                this.graphics,
                segment.p1,
                segment.p2,
                segment.color,
                this.camera.screenWidth
            );
        }

        if (this.player.texture.key !== this.playerLogic.spriteKey) {
            this.player.setTexture(this.playerLogic.spriteKey);
        }

        const roadCenterX = this.camera.screenWidth / 2;
        const roadHalfWidth = this.camera.roadWidth / 2.5;
        const lateral = this.playerLogic.xOffset * roadHalfWidth * 0.3;
        this.player.x = roadCenterX + lateral;
        this.yBounce = Math.random() * 4 - 2;
        this.player.y = 450 + this.playerLogic.yBounce;
    }

    buildRoad(plan) {
        const segments = [];
        const segmentLength = 200;

        const add = (curve, length, elevation = 0) => {
            this.addRoadSection(
                curve,
                length,
                segments,
                segmentLength,
                elevation
            );
        };

        plan.forEach((section) => {
            add(section.curve, section.length, section.elevation || 0);
        });

        this.segments = segments;
        this.totalSegments = segments.length;
        this.segmentLength = segmentLength;

        this.checkpoints = [
            Math.floor(this.totalSegments * 0.25),
            Math.floor(this.totalSegments * 0.50),
            Math.floor(this.totalSegments * 0.75),
        ];

        this.checkpoints.forEach(i => {
            if (this.segments[i]) {
                this.segments[i].isCheckpoint = true;
                this.segments[i].checkpointHit = false;
            }
        });

        return segments;
    }

    addRoadSection(curve, length, segments, segmentLength, elevation = 0) {
        const startIndex = segments.length;
        let lastY = startIndex > 0 ? segments[startIndex - 1].p2.world.y : 0;

        for (let i = 0; i < length; i++) {
            const idx = startIndex + i;

            const seg = new RoadSegment(
                idx,
                idx * segmentLength,
                curve,
                elevation
            );

            seg.p1.world.z = idx * segmentLength;
            seg.p2.world.z = (idx + 1) * segmentLength;

            seg.p1.world.y = lastY;
            seg.p2.world.y = lastY + elevation * segmentLength;
            lastY = seg.p2.world.y;

            segments.push(seg);
        }
    }

    handleTimeUp() {
        console.log("⏳ GAME OVER — Time Up!");

        this.scene.pause();
        this.scene.launch("GameOver");
    }

    addTime(seconds) {
        this.timeRemaining += seconds * 1000;

        // Evita número negativo em loops futuros
        this.timeDisplay = Math.floor(this.timeRemaining / 1000);
        this.timerText.setText(`TIME: ${this.timeDisplay}`);

        // Efeito visual no timer
        this.timerText.setScale(1.4);
        this.tweens.add({
            targets: this.timerText,
            scale: 1,
            duration: 150,
            ease: "Quad.easeOut"
        });
    }

    showCheckpointMessage(msg) {
    const text = this.add.text(400, 200, msg, {
        fontFamily: "Arial",
        fontSize: "48px",
        fontStyle: "bold",
        color: "#ffff00",
        stroke: "#000",
        strokeThickness: 6,
    }).setOrigin(0.5);

    this.tweens.add({
        targets: text,
        y: 120,
        alpha: 0,
        duration: 1500,
        ease: "Quad.easeOut",
        onComplete: () => text.destroy()
    });
}


}

function drawSegment(g, p1Point, p2Point, color, screenWidth = 800, lanes = 3) {
    if (!p1Point || !p2Point) return;
    if (!p1Point.screen || !p2Point.screen) return;

    const p1 = p1Point.screen;
    const p2 = p2Point.screen;

    if (!isFinite(p1.y) || !isFinite(p2.y)) return;

    const topY = Math.min(p1.y, p2.y);
    const bottomY = Math.max(p1.y, p2.y);

    // ----- GRAMA -----
    g.fillStyle(color.grass);
    g.fillRect(0, topY, screenWidth, bottomY - topY);

    // ---- RUMBLE ----
    const rumble1 = p1.w * 0.1;
    const rumble2 = p2.w * 0.1;

    g.fillStyle(color.rumble);
    drawPoly(g, [
        p1.x - p1.w - rumble1,
        p1.y,
        p1.x - p1.w,
        p1.y,
        p2.x - p2.w,
        p2.y,
        p2.x - p2.w - rumble2,
        p2.y,
    ]);
    drawPoly(g, [
        p1.x + p1.w + rumble1,
        p1.y,
        p1.x + p1.w,
        p1.y,
        p2.x + p2.w,
        p2.y,
        p2.x + p2.w + rumble2,
        p2.y,
    ]);

    // ----- ROAD -----
    g.fillStyle(color.road);
    drawPoly(g, [
        p1.x - p1.w,
        p1.y,
        p1.x + p1.w,
        p1.y,
        p2.x + p2.w,
        p2.y,
        p2.x - p2.w,
        p2.y,
    ]);

    // ----- LANES ------
    if (lanes > 1 && p1Point.index % 3 === 0) {
        const laneW1 = (p1.w * 2) / lanes;
        const laneW2 = (p2.w * 2) / lanes;
        let laneX1 = p1.x - p1.w + laneW1;
        let laneX2 = p2.x - p2.w + laneW2;

        const markerW1 = Math.max(2, p1.w * 0.05);
        const markerW2 = Math.max(2, p2.w * 0.05);

        g.fillStyle(color.lane ?? 0xffffff, 1);

        for (let lane = 1; lane < lanes; lane++) {
            drawPoly(g, [
                laneX1 - markerW1 / 2,
                p1.y,
                laneX1 + markerW1 / 2,
                p1.y,
                laneX2 + markerW2 / 2,
                p2.y,
                laneX2 - markerW2 / 2,
                p2.y,
            ]);

            laneX1 += laneW1;
            laneX2 += laneW2;
        }
    }
}

function drawPoly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) {
        g.lineTo(pts[i], pts[i + 1]);
    }
    g.closePath();
    g.fill();
}
