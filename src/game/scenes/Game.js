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
        this.raceFinished = false;
        this.sound.stopAll();

        const backgroundMusic = this.sound.add("backgroundMusic");
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.3;
        backgroundMusic.play();

        this.engineSfx = this.sound.add("engine");
        const soundAsset = this.cache.audio.get("engine");
        const duration = soundAsset ? soundAsset.duration : 0;
        const startPoint = 18;
        if (duration > startPoint) {
            this.engineSfx.addMarker({
                name: "loopMotor",
                start: startPoint,
                duration: 5,
                config: {
                    loop: true,
                    volume: 0.2,
                },
            });
            this.engineSfx.play("loopMotor");
        } else {
            // Fallback: Se algo der errado com a duração, toca o som inteiro
            console.warn("Audio engine muito curto ou duração não encontrada.");
            this.engineSfx.play({ loop: true, volume: 0.6 });
        }

        // Define a taxa inicial
        this.engineSfx.setRate(0.5);

        this.crashSfx = this.sound.add("crash");

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

        this.MAX_PLAYER_SPEED = 120;
        this.pendingBoost = 0;
        this.boostPerTap = 20;
        this.boostApplyPerSec = 260;
        this.pendingBoostCap = this.MAX_PLAYER_SPEED * 1.2;

        this.virtualGasMs = 0;
        this.virtualGasPerTap = 140;
        this.virtualGasCapMs = 520;

        this.input.keyboard.on("keydown-W", (e) => this.onAccelTap(e));
        this.input.keyboard.on("keydown-UP", (e) => this.onAccelTap(e));

        this.setupSpeedometer();

        // ESC para Pausar
        this.input.keyboard.on("keydown-ESC", () => {
            if (this.scene.isActive("Pause")) return;

            this.scene.launch("Pause");
            this.scene.pause();
        });

        this.graphics = this.add.graphics();
        this.roadPlan = [
            { curve: 0.0, length: 1000, elevation: 0 },
            { curve: 1.0, length: 1000, elevation: 0 },
            { curve: -1.0, length: 200, elevation: 0 },
            { curve: 1.0, length: 200, elevation: 0 },
            { curve: -1.0, length: 200, elevation: 0 },
            { curve: 1.0, length: 200, elevation: 0 },
            { curve: -1.0, length: 200, elevation: 0 },
            { curve: 1.0, length: 200, elevation: 0 },
            { curve: -0.6, length: 1500, elevation: 0 }, // curva direita
            { curve: -0.5, length: 600, elevation: 0 }, // curva esquerda
            { curve: 0.0, length: 300, elevation: 0 }, // reta longa
            { curve: 0.4, length: 1200, elevation: 0 }, // curva direita leve
            { curve: -1.0, length: 200, elevation: 0 },
            { curve: 1.0, length: 200, elevation: 0 },
            { curve: -1.0, length: 200, elevation: 0 },
            { curve: 1.0, length: 200, elevation: 0 },
            { curve: -1.0, length: 200, elevation: 0 },
            { curve: 1.0, length: 200, elevation: 0 },
            { curve: 0.0, length: 2000, elevation: 0 }, // reta final
        ];
        this.segments = this.buildRoad(this.roadPlan);
        this.addRoadsideObjects();

        this.speed = 0;
        this.lateralOffset = 0;

        this.camera = new Camera({
            screenWidth: 800,
            screenHeight: 600,
            roadWidth: 2000,
            depth: 0.8,
        });

        this.playerLogic = new Player();

        this.playerLogic.maxSpeed = this.MAX_PLAYER_SPEED; // 200


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
        this.timeTotal = 50000;
        this.timeRemaining = this.timeTotal;
        this.timeDisplay = 0;

        this.timerText = this.add.text(650, 20, "TIME: 10", {
            fontFamily: "Arial",
            fontSize: "32px",
            fontStyle: "bold",
            color: "#fff",
        });
        this.timerText.setDepth(1000);

        this.isOffRoad = false;

        // tráfego / colisões (valores controlados)
        this.traffic = [];
        this.trafficSpritesGroup = this.add.group();

        this.maxTraffic = 6; // número máximo de carros na pista
        this.minTrafficAhead = 4;
        this.spawnInterval = 3000; // ms entre tentativas de spawn
        this.lastTrafficSpawnTime = 0;

        this.trafficSpawnMin = 26000; // mínimo à frente do player
        this.trafficSpawnMax = 36000; // máximo à frente do player (jitter)
        this.trafficMinGap = 3500; // distância mínima entre carros no spawn (em world units)
        this.trafficCarKeys = ["car01"];
        this.playerOffset = 2400;
        this.despawnBehind = 8000; // remove carros que ficaram muito atrás
        this.despawnAhead = 60000; // remove carros longe demais (fora do que você desenha ~300*200=60000)
        this.spawnAttempts = 12; // tentativas por ciclo pra achar um spawnZ livre

        // spawn inicial controlado (poucos carros, bem espaçados)
        this.spawnInitialTraffic();

        // timer para tentar spawns regulares (o próprio trySpawnTraffic valida tudo)
        this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => this.spawnDirector(),
        });

        this.bounce = 0;
        this.xOffset = 0;
    }

    onAccelTap(e) {
        // evita OS key-repeat (segurar tecla não conta como “tap” infinito)
        if (e && e.repeat) return;

        this.pendingBoost = Math.min(
            this.pendingBoost + this.boostPerTap,
            this.pendingBoostCap
        );
        this.virtualGasMs = Math.min(
            this.virtualGasMs + this.virtualGasPerTap,
            this.virtualGasCapMs
        );
    }

    setupSpeedometer() {
        const w = Number(this.game.config.width);
        const h = Number(this.game.config.height);

        this.speedo = {
            x: 95,
            y: h - 90,
            r: 62,
            gfx: this.add.graphics().setDepth(1000).setScrollFactor(0),
            text: this.add
                .text(24, h - 52, "SPD 0", {
                    fontFamily: "Arial",
                    fontSize: "18px",
                    fontStyle: "bold",
                    color: "#ffffff",
                    stroke: "#000",
                    strokeThickness: 4,
                })
                .setDepth(1001)
                .setScrollFactor(0),
        };

        // primeira renderização
        this.updateSpeedometer(0);
    }

    updateSpeedometer(speed) {
        if (!this.speedo) return;

        const { x, y, r, gfx, text } = this.speedo;

        const max = this.MAX_PLAYER_SPEED ?? 110;
        const t = Phaser.Math.Clamp(speed / max, 0, 1);

        const minAngle = Phaser.Math.DegToRad(150);
        const maxAngle = Phaser.Math.DegToRad(390);

        const ang = Phaser.Math.Linear(minAngle, maxAngle, t);

        const start = Phaser.Math.DegToRad(210);
        const end = Phaser.Math.DegToRad(-30);

        gfx.clear();

        // fundo
        gfx.fillStyle(0x000000, 0.35);
        gfx.fillCircle(x, y, r + 14);

        // borda
        gfx.lineStyle(4, 0xffffff, 0.85);
        gfx.strokeCircle(x, y, r + 12);

        // arco
        gfx.lineStyle(6, 0xffffff, 0.55);
        gfx.beginPath();
        gfx.arc(x, y, r, minAngle, maxAngle, false);
        gfx.strokePath();

        // ticks
        gfx.lineStyle(2, 0xffffff, 0.65);
        for (let i = 0; i <= 10; i++) {
            const a = Phaser.Math.Linear(minAngle, maxAngle, i / 10);
            const inner = r - 6;
            const outer = r + 6;
            gfx.beginPath();
            gfx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
            gfx.lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer);
            gfx.strokePath();
        }

        // agulha
        gfx.lineStyle(3, 0xff3b3b, 1);
        gfx.beginPath();
        gfx.moveTo(x, y);
        gfx.lineTo(x + Math.cos(ang) * (r - 10), y + Math.sin(ang) * (r - 10));
        gfx.strokePath();

        gfx.fillStyle(0xff3b3b, 1);
        gfx.fillCircle(x, y, 4);

        text.setText(`SPD ${Math.round(speed)}`);
    }

    checkTrafficCollision(cars, playerZ) {
        const playerX = this.playerLogic.xOffset;

        const PLAYER_W = 0.28; // "largura" do player em units de pista
        const Z_HIT = 150; // quão perto no eixo Z precisa estar (segmentLength=200)
        const SHRINK = 0.65; // encolhe a hitbox lateral (0.5~0.8)

        let closest = null;
        let bestDz = Infinity;

        for (const car of cars) {
            if (!car || car.alive === false) continue;

            // opcional: evita colisão antes do carro sequer aparecer na tela
            if (car.sprite && !car.sprite.visible) continue;

            const dz = Math.abs(car.z - playerZ);
            if (dz > Z_HIT) continue;

            const carW = car.width ?? 0.34;
            const dx = Math.abs(car.x - playerX);

            const hit = (PLAYER_W + carW) * 0.5 * SHRINK;

            if (dx < hit && dz < bestDz) {
                closest = car;
                bestDz = dz;
            }
        }

        return closest;
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
                ease: "Quad.easeOut",
            });

            if (this.timeDisplay <= 0) {
                this.handleTimeUp();
            }
        }

        // ===============================================
        // LÓGICA DE ÁUDIO DO MOTOR (RPM)
        // ===============================================

        // Proteção: se o som não estiver tocando, ignora
        if (this.engineSfx && this.engineSfx.isPlaying) {
            const currentSpeed = this.playerLogic.speed;
            const maxSpeed = this.MAX_PLAYER_SPEED ?? 200;


            // Cálculo da taxa:
            // Começa em 0.5 (marcha lenta) e adiciona até +1.5 baseado na % da velocidade
            let targetRate = 0.5 + (currentSpeed / maxSpeed) * 1.5;

            // Limita para não ficar agudo demais ou grave demais
            targetRate = Phaser.Math.Clamp(targetRate, 0.5, 2.5);

            // Aplica a taxa
            this.engineSfx.setRate(targetRate);
        }

        this.xOffset += this.bounce;
        this.bounce = this.bounce * 0.9;
        if (Math.abs(this.bounce) < 0.001) this.bounce = 0;
        this.xOffset = Phaser.Math.Clamp(this.xOffset, -3, 3);

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

        if (this.virtualGasMs > 0) {
            this.virtualGasMs -= delta;
            if (this.virtualGasMs < 0) this.virtualGasMs = 0;
            inputState.up = true;
        }

        if (inputState.down) {
            this.pendingBoost = Math.max(
                0,
                this.pendingBoost - this.boostApplyPerSec * 2 * (delta / 1000)
            );
            this.virtualGasMs = 0;
        }

        const playerZ = this.camera.z + this.playerOffset;
        const baseSegmentIndex =
            Math.floor(this.camera.z / this.segmentLength) %
            this.segments.length;
        const currentSegment = this.segments[baseSegmentIndex];
        const playerSegmentIndex = Math.floor(playerZ / this.segmentLength);
        currentSegment.isOffRoad = Math.abs(this.playerLogic.xOffset) > 0.9;
        let potentialCollisions = [];
        const playerSegIndex =
            Math.floor(playerZ / this.segmentLength) % this.segments.length;
        const playerSeg = this.segments[playerSegIndex];

        for (let i = 0; i <= 1; i++) {
            const checkIndex = (playerSegmentIndex + i) % this.segments.length;
            const seg = this.segments[checkIndex];

            if (seg && seg.cars && seg.cars.length > 0) {
                potentialCollisions = potentialCollisions.concat(seg.cars);
            }
        }

        const collisionCar = this.checkTrafficCollision(
            potentialCollisions,
            playerZ
        );

        if (collisionCar) {
            this.handleCollision(collisionCar);
        }

        if (playerSeg && playerSeg.sprites && playerSeg.sprites.length > 0) {
            for (const obj of playerSeg.sprites) {
                if (obj.noCollision) continue; // <-- ADICIONE ISSO

                const playerW = 0.8;
                const objW = obj.width || 0.6;

                if (
                    Math.abs(this.playerLogic.xOffset - obj.offset) <
                    playerW / 2 + objW / 2
                ) {
                    this.handleSceneryCollision(obj);
                }
            }
        }

        this.updateTraffic(delta, playerZ);

        if (!this.raceFinished && playerZ >= this.finishZ) {
            this.raceFinished = true;
            this.playerLogic.speed = 0;
            this.engineSfx?.stop();
            this.pendingBoost = 0;
            this.virtualGasMs = 0;

            const remaining = Math.max(0, this.timeDisplay);
            this.registry.set("remainingTime", remaining);

            this.showCheckpointMessage("FINISH!");
            this.scene.pause();
            this.scene.launch("Finish", { remainingTime: remaining });
        }

        // ===== CHECKPOINT DETECTION =====
        if (
            currentSegment &&
            currentSegment.isCheckpoint &&
            !currentSegment.checkpointHit
        ) {
            currentSegment.checkpointHit = true;
            this.addTime(40);
            this.showCheckpointMessage("+40s");
        }

        // MOVIMENTO
        this.playerLogic.update(
            inputState,
            currentSegment,
            this.game.loop.delta
        );

        const dt = Math.max(0.0001, delta / 1000);

        if (this.pendingBoost > 0) {
            const add = Math.min(this.pendingBoost, this.boostApplyPerSec * dt);
            this.playerLogic.speed += add;
            this.pendingBoost -= add;
        }

        const offroadCap = currentSegment?.isOffRoad
            ? this.MAX_PLAYER_SPEED * 0.65
            : this.MAX_PLAYER_SPEED;
        this.playerLogic.speed = Phaser.Math.Clamp(
            this.playerLogic.speed,
            0,
            offroadCap
        );

        this.camera.moveZ(this.playerLogic.speed);

        this.updateSpeedometer(this.playerLogic.speed);

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

            segment.p1.isFinish = !!segment.isFinish;
            segment.p2.isFinish = !!segment.isFinish;

            segment.p1.finishStage = segment.finishStage;
            segment.p2.finishStage = segment.finishStage;

            drawSegment(
                this.graphics,
                segment.p1,
                segment.p2,
                segment.color,
                this.camera.screenWidth
            );

            // === OBJETOS DE CENÁRIO ===
            if (segment.sprites) {
                for (const obj of segment.sprites) {
                    const worldX =
                        segment.p1.world.x +
                        obj.offset * (this.camera.roadWidth / 2);
                    const worldY = segment.p1.world.y;
                    const worldZ = segment.p1.world.z;

                    const point = {
                        world: { x: worldX, y: worldY, z: worldZ },
                        camera: { x: 0, y: 0, z: 0 },
                        screen: { x: 0, y: 0, w: 0 },
                    };

                    this.camera.projectPoint(point);

                    if (point.screen.w <= 0) continue;

                    let sprite = obj.sprite;

                    // cria sprite se não existir
                    if (!sprite) {
                        sprite = this.add.sprite(0, 0, obj.source);
                        sprite.setOrigin(0.5, 1);
                        obj.sprite = sprite;
                    }

                    sprite.x = point.screen.x;

                    const customScale = obj.scale || 1;
                    const finalScale = (point.screen.w / 300) * customScale;

                    sprite.y = point.screen.y - (obj.raise || 0) * finalScale;
                    sprite.setScale(finalScale);
                    sprite.setDepth(150000 - point.screen.y);
                }
            }
        }

        if (this.player.texture.key !== this.playerLogic.spriteKey) {
            this.player.setTexture(this.playerLogic.spriteKey);
        }

        const playerSegIndexSafe =
            ((Math.floor(playerZ / this.segmentLength) % this.segments.length) +
                this.segments.length) %
            this.segments.length;

        const segForPlayer = this.segments[playerSegIndexSafe];

        if (segForPlayer) {
            const roadPoint = {
                world: {
                    x: segForPlayer.p1.world.x,
                    y: segForPlayer.p1.world.y,
                    z: playerZ,
                },
                camera: { x: 0, y: 0, z: 0 },
                screen: { x: 0, y: 0, w: 0 },
            };

            this.camera.projectPoint(roadPoint);

            this.player.x =
                roadPoint.screen.x +
                this.playerLogic.xOffset * roadPoint.screen.w;
        } else {
            this.player.x = this.camera.screenWidth / 2;
        }
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

        plan.forEach((section) =>
            add(section.curve, section.length, section.elevation || 0)
        );

        this.segments = segments;
        this.totalSegments = segments.length;
        this.segmentLength = segmentLength;

        this.checkpoints = [
            Math.floor(this.totalSegments * 0.25),
            Math.floor(this.totalSegments * 0.5),
            Math.floor(this.totalSegments * 0.75),
        ];

        this.checkpoints.forEach((i) => {
            if (this.segments[i]) {
                this.segments[i].isCheckpoint = true;
                this.segments[i].checkpointHit = false;
            }
        });

        // ===== FINISH =====
        this.finishSegmentIndex = Math.max(0, this.totalSegments - 8);

        this.finishLineT = 0.62;

        this.finishApproachSegments = 4;

        this.finishZ =
            (this.finishSegmentIndex + this.finishLineT) * this.segmentLength;

        for (let i = 0; i <= this.finishApproachSegments; i++) {
            const idx = this.finishSegmentIndex - i;
            const seg = this.segments[idx];
            if (seg) seg.finishStage = i;
        }

        this.addRaceMarkers();

        return segments;
    }

    addRaceMarkers() {
        const sideOffset = 5.2;

        for (const idx of this.checkpoints) {
            const seg = this.segments[idx];
            if (!seg) continue;

            seg.sprites.push({
                source: "checkpointEsquerdo",
                offset: -sideOffset,
                scale: 2.4,
                width: 1.0,
                noCollision: true,
                raise: 40,
            });

            seg.sprites.push({
                source: "checkpointDireito",
                offset: sideOffset,
                scale: 2.4,
                width: 1.0,
                noCollision: true,
                raise: 40,
            });
        }

        const finishSeg = this.segments[this.finishSegmentIndex];
        if (finishSeg) {
            finishSeg.sprites.push({
                source: "finish",
                offset: 0,
                scale: 3.2,
                width: 3.5,
                noCollision: true,
                raise: 5,
            });
        }
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

        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }

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
            ease: "Quad.easeOut",
        });
    }

    showCheckpointMessage(msg) {
        const text = this.add
            .text(400, 200, msg, {
                fontFamily: "Arial",
                fontSize: "48px",
                fontStyle: "bold",
                color: "#ffff00",
                stroke: "#000",
                strokeThickness: 6,
            })
            .setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: 120,
            alpha: 0,
            duration: 1500,
            ease: "Quad.easeOut",
            onComplete: () => text.destroy(),
        });
    }

    addCar(spriteKey, z, offsetX, speed = null) {
        const width = spriteKey === "semi" ? 0.6 : 0.34;

        const car = {
            spriteKey,
            z,
            x: offsetX,
            speed: speed ?? 80 + Math.random() * 80,
            width,
            sprite: null,
            alive: true,
        };

        const sprite = this.add.sprite(0, 0, spriteKey).setOrigin(0.5, 1);
        sprite.setVisible(false); // evita “pop” em (0,0)
        this.trafficSpritesGroup.add(sprite);
        car.sprite = sprite;

        this.traffic.push(car);
        return car;
    }

    spawnInitialTraffic() {
        const initialCount = 6;
        const playerZ = this.camera.z + this.playerOffset;

        let z = playerZ + this.trafficSpawnMax; // começa lá na frente

        for (let i = 0; i < initialCount; i++) {
            const key = Phaser.Utils.Array.GetRandom(this.trafficCarKeys);
            const offsetX = Phaser.Math.FloatBetween(-0.9, 0.9);
            const speed = Phaser.Math.FloatBetween(20, 54);

            this.addCar(key, z, offsetX, speed);

            z += Phaser.Math.Between(
                this.trafficMinGap,
                this.trafficMinGap + 2000
            );
        }
    }

    trySpawnTraffic(force = false) {
        const now = this.time.now;

        if (!force && now - this.lastTrafficSpawnTime < this.spawnInterval)
            return false;
        if (this.traffic.length >= this.maxTraffic) return false;

        const playerZ = this.camera.z + this.playerOffset;

        const laneOptions = [-0.9, -0.3, 0.3, 0.9];

        for (let attempt = 0; attempt < this.spawnAttempts; attempt++) {
            const spawnZ =
                playerZ +
                Phaser.Math.Between(this.trafficSpawnMin, this.trafficSpawnMax);

            if (!this.isSpawnZFree(spawnZ, this.trafficMinGap)) continue;

            const key = Phaser.Utils.Array.GetRandom(this.trafficCarKeys);
            const offsetX = Phaser.Utils.Array.GetRandom(laneOptions);
            const speed = Phaser.Math.FloatBetween(20, 54);

            this.addCar(key, spawnZ, offsetX, speed);
            this.lastTrafficSpawnTime = now;
            return true;
        }

        // fallback: relaxa um pouco o gap e tenta de novo
        for (let attempt = 0; attempt < this.spawnAttempts; attempt++) {
            const spawnZ =
                playerZ +
                Phaser.Math.Between(this.trafficSpawnMin, this.trafficSpawnMax);

            if (!this.isSpawnZFree(spawnZ, this.trafficMinGap * 0.6)) continue;

            const key = Phaser.Utils.Array.GetRandom(this.trafficCarKeys);
            const offsetX = Phaser.Utils.Array.GetRandom(laneOptions);
            const speed = Phaser.Math.FloatBetween(20, 54);

            this.addCar(key, spawnZ, offsetX, speed);
            this.lastTrafficSpawnTime = now;
            return true;
        }

        return false;
    }

    spawnDirector() {
        const playerZ = this.camera.z + this.playerOffset;

        // garante um mínimo sempre (ignora intervalo se precisar)
        this.ensureTraffic(playerZ);

        // mantém teu comportamento “normal” respeitando spawnInterval
        this.trySpawnTraffic(false);
    }

    ensureTraffic(playerZ) {
        const from = playerZ + this.trafficSpawnMin;
        const to = playerZ + this.trafficSpawnMax;

        let count = 0;
        for (const c of this.traffic) {
            if (c.z >= from && c.z <= to) count++;
        }

        // força spawn até atingir o mínimo ou bater no maxTraffic
        while (
            count < this.minTrafficAhead &&
            this.traffic.length < this.maxTraffic
        ) {
            const spawned = this.trySpawnTraffic(true); // força
            if (!spawned) break;
            count++;
        }
    }

    isSpawnZFree(spawnZ, gap) {
        for (const c of this.traffic) {
            if (Math.abs(c.z - spawnZ) < gap) return false;
        }
        return true;
    }

    updateTraffic(delta, playerZ) {
        // normaliza para “unidades por frame ~60fps”
        const frameScale = Math.max(0.0001, delta / 16.67);

        // limpa lista de carros em cada segmento
        for (let i = 0; i < this.segments.length; i++) {
            this.segments[i].cars = [];
        }

        for (let i = this.traffic.length - 1; i >= 0; i--) {
            const car = this.traffic[i];

            if (
                car.z < playerZ - this.despawnBehind ||
                car.z > playerZ + this.despawnAhead
            ) {
                car.sprite?.destroy();
                this.traffic.splice(i, 1);
                continue;
            }

            // mundo: carro anda pela própria velocidade
            car.z += car.speed * frameScale;

            // remove quando sai do mundo
            if (
                car.z > this.totalSegments * this.segmentLength + 10000 ||
                car.z < -10000
            ) {
                car.sprite?.destroy();
                this.traffic.splice(i, 1);
                continue;
            }

            // índice seguro (inclusive se algum dia ficar negativo)
            const len = this.segments.length;
            const segIndex =
                ((Math.floor(car.z / this.segmentLength) % len) + len) % len;
            const seg = this.segments[segIndex];

            if (!seg) {
                car.sprite?.setVisible(false);
                continue;
            }

            seg.cars.push(car);

            // curva empurra lateralmente
            const curve = seg.curve || 0;
            const centrifugalFactor = 0.01;
            const maxSpeed = this.MAX_PLAYER_SPEED ?? 200;


            //car.x -= curve * (car.speed / maxSpeed) * centrifugalFactor * frameScale;
            car.x = Phaser.Math.Clamp(car.x, -2.2, 2.2);

            // projetar
            const tmpPoint = {
                world: {
                    x: seg.p1.world.x + car.x * (this.camera.roadWidth / 2),
                    y: seg.p1.world.y,
                    z: car.z,
                },
                camera: { x: 0, y: 0, z: 0 },
                screen: { x: 0, y: 0, w: 0 },
            };

            this.camera.projectPoint(tmpPoint);

            // desenhar
            if (
                isFinite(tmpPoint.screen.x) &&
                isFinite(tmpPoint.screen.y) &&
                tmpPoint.screen.w > 0
            ) {
                const scale = tmpPoint.screen.w / 340;

                car.sprite.x = tmpPoint.screen.x;
                car.sprite.y = tmpPoint.screen.y;
                car.sprite.setScale(Math.max(0.12, scale * 1.2));
                car.sprite.setVisible(true);
                car.sprite.setDepth(200000 - tmpPoint.screen.y);
            } else {
                car.sprite.setVisible(false);
            }
        }
    }

    handleCollision(car) {
        if (!this.crashSfx.isPlaying) {
            this.crashSfx.play({ volume: 0.8 });
        }

        // 1. ZERA VELOCIDADE (Mantém sua lógica)
        this.playerLogic.speed = this.playerLogic.speed * 0.3;

        // 2. APLICA IMPULSO SUAVE NO PLAYER
        // Define uma força de impacto. 0.06 é um bom valor para começar.
        // Se quiser um impacto mais forte, aumente para 0.08 ou 0.1.
        const impactForce = 0.06;

        if (this.playerLogic.xOffset < car.x) {
            // Empurra para a ESQUERDA (negativo)
            this.playerLogic.bounce = -impactForce;
        } else {
            // Empurra para a DIREITA (positivo)
            this.playerLogic.bounce = impactForce;
        }

        // 3. EMPURRA O NPC SUAVEMENTE (Usando Tween do Phaser)
        // Como o NPC não tem a lógica complexa de update do player,
        // usamos um Tween para animar o deslize dele.
        const npcDirection = car.x < this.playerLogic.xOffset ? -0.5 : 0.5;

        this.tweens.add({
            targets: car,
            x: car.x + npcDirection, // Destino final do deslize
            duration: 500, // Duração em ms (meio segundo)
            ease: "Cubic.out", // Começa rápido e termina devagar
        });

        // 4. Evita múltiplas colisões (Mantém sua lógica)
        car.z -= 2; // Pequeno recuo para sair da hitbox imediatamente

        this.pendingBoost = 0;
        this.virtualGasMs = 0;
    }

    handleSceneryCollision(obj) {
        // Se já estiver parado ou muito devagar, ignora (evita loops de colisão)
        if (this.playerLogic.speed < 10) return;

        this.crashSfx.play({ volume: 1.0, detune: -200 });

        // 1. PARA O CARRO DRASTICAMENTE
        this.playerLogic.speed = 0;

        this.pendingBoost = 0;
        this.virtualGasMs = 0;

        // 2. EMPURRA DE VOLTA (para não ficar preso dentro da árvore)
        // Se bateu na direita, joga um pouco pra esquerda
        if (this.playerLogic.xOffset > obj.offset) {
            this.playerLogic.xOffset += 0.8;
        } else {
            this.playerLogic.xOffset -= 0.8;
        }

        // 3. EFEITO VISUAL (Shake na câmera)
        this.cameras.main.shake(200, 0.02);

        // 4. (Opcional) Som de batida seca
        // this.sound.play('treeHit');
    }

    addRoadsideObjects() {
        // Removemos o "treeFrequency" fixo
        const billboardFrequency = 1000;

        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];

            // --- CORREÇÃO DA DENSIDADE ---
            // Usa aleatoriedade (Math.random).
            // 0.03 significa 3% de chance de ter árvore em um segmento.
            // Se quiser mais árvores, aumente para 0.05 ou 0.1
            if (Math.random() < 0.03) {
                // Escolhe um lado aleatório (-1 ou 1) e multiplica pela distância
                const side = Math.random() > 0.5 ? 1 : -1;
                // Distância da pista: entre 2.5 e 5.0 unidades (para variar a profundidade lateral)
                const distance = 2.0 + Math.random() * 3.0;

                seg.sprites.push({
                    source: "collision01",
                    offset: distance * side,
                    width: 0.6, // Adicionamos uma propriedade de largura lógica para colisão
                });
            }
            // -----------------------------

            // Mantém os billboards (eles são raros, ok usar modulo)
            if (i % billboardFrequency === 0) {
                seg.sprites.push({
                    source: "collision03",
                    offset: 5.8,
                    width: 1.8,
                    scale: 5.0,
                });
                seg.sprites.push({
                    source: "collision02",
                    offset: -4.8,
                    width: 2.8,
                    scale: 3.5,
                });
            }
        }
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

    if (p1Point.finishStage !== undefined) {
        const stage = p1Point.finishStage;

        const centerT = 0.62;
        const thicknessT = stage === 0 ? 0.28 : 0.16;
        const alpha = stage === 0 ? 1 : Math.max(0.18, 0.75 - stage * 0.15);

        drawFinishLine(g, p1, p2, 10, centerT, thicknessT, alpha);
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

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function drawFinishLine(
    g,
    p1,
    p2,
    squares = 10,
    centerT = 0.62,
    thicknessT = 0.28,
    alpha = 1
) {
    const half = thicknessT * 0.5;
    const t1 = Phaser.Math.Clamp(centerT - half, 0, 0.95);
    const t2 = Phaser.Math.Clamp(centerT + half, 0.05, 1);

    const x1 = lerp(p1.x, p2.x, t1);
    const y1 = lerp(p1.y, p2.y, t1);
    const w1 = lerp(p1.w, p2.w, t1);

    const x2 = lerp(p1.x, p2.x, t2);
    const y2 = lerp(p1.y, p2.y, t2);
    const w2 = lerp(p1.w, p2.w, t2);

    const left1 = x1 - w1,
        right1 = x1 + w1;
    const left2 = x2 - w2,
        right2 = x2 + w2;

    const step1 = (right1 - left1) / squares;
    const step2 = (right2 - left2) / squares;

    for (let i = 0; i < squares; i++) {
        g.fillStyle(i % 2 === 0 ? 0xffffff : 0x111111, alpha);

        drawPoly(g, [
            left1 + step1 * i,
            y1,
            left1 + step1 * (i + 1),
            y1,
            left2 + step2 * (i + 1),
            y2,
            left2 + step2 * i,
            y2,
        ]);
    }
}
