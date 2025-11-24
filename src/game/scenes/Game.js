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
            { curve: 0.0, length: 1000, elevation: 0 },
            { curve: 1.0, length: 1000, elevation: 0 },
            { curve: 0.0, length: 1000, elevation: 0 }, // reta inicial
            { curve: -0.6, length: 1500, elevation: 0 }, // curva direita
            { curve: -0.5, length: 600, elevation: 0 }, // curva esquerda
            { curve: 0.0, length: 300, elevation: 0 }, // reta longa
            { curve: 0.4, length: 1200, elevation: 0 }, // curva direita leve
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
        this.timeTotal = 60000;
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

        this.maxTraffic = 12;            // número máximo de carros na pista
        this.spawnInterval = 3000;       // ms entre tentativas de spawn
        this.lastTrafficSpawnTime = 0;

        this.trafficSpawnAhead = 8000;   // distância (em world units) à frente do player para spawn
        this.trafficMinGap = 2000;        // distância mínima entre carros no spawn (em world units)
        this.trafficCarKeys = ["car01"];

        // spawn inicial controlado (poucos carros, bem espaçados)
        this.spawnInitialTraffic();

        // timer para tentar spawns regulares (o próprio trySpawnTraffic valida tudo)
        this.time.addEvent({
            delay: 500, // checa frequentemente, mas trySpawnTraffic respeita spawnInterval
            loop: true,
            callback: () => this.trySpawnTraffic()
        });

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
        currentSegment.isOffRoad = Math.abs(this.playerLogic.xOffset) > 0.9;
        const npcCars = currentSegment.cars || [];

        const collisionCar = this.playerLogic.checkTrafficCollision(npcCars);

        if (collisionCar) {
            this.handleCollision(collisionCar);
        }
        this.updateTraffic(delta);


        // ===== CHECKPOINT DETECTION =====
        if (currentSegment && currentSegment.isCheckpoint && !currentSegment.checkpointHit) {
            currentSegment.checkpointHit = true;
            this.addTime(10); // +10 segundos
            this.showCheckpointMessage("+60s");
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

            // === OBJETOS DE CENÁRIO ===
            if (segment.sprites) {
                for (const obj of segment.sprites) {

                    const worldX = segment.p1.world.x + obj.offset * (this.camera.roadWidth / 2);
                    const worldY = segment.p1.world.y;
                    const worldZ = segment.p1.world.z;

                    const point = {
                        world: { x: worldX, y: worldY, z: worldZ },
                        camera: { x: 0, y: 0, z: 0 },
                        screen: { x: 0, y: 0, w: 0 }
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

                    // posicionar na tela
                    sprite.x = point.screen.x;
                    sprite.y = point.screen.y;

                    const scale = point.screen.w / 300;
                    sprite.setScale(scale);

                    // ordenar pela profundidade
                    sprite.setDepth(150000 - point.screen.y);
                }
            }

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
        this.timeRemaining += seconds * 6000;

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

    addCar(spriteKey, z, offsetX, speed = null) {
        // largura lógica usada para colisões (em "road width" units)
        const width = spriteKey === "semi" ? 0.9 : 0.5;

        const car = {
            spriteKey,
            z,            // posição no mundo (unidades compatíveis com segmentLength)
            x: offsetX,   // lateral (-1..1 é o center normalized, pode extrapolar)
            speed: speed ?? (80 + Math.random() * 80), // velocidade própria
            width,
            sprite: null, // referência ao sprite Phaser (criada no spawn)
            alive: true
        };

        // cria sprite Phaser (posicionado temporariamente)
        car.sprite = this.add.sprite(0, 0, spriteKey).setOrigin(0.5, 1);
        car.sprite.setDepth(50); // ajustar conforme necessário
        this.trafficSpritesGroup.add(car.sprite);

        this.traffic.push(car);
        return car;
    }


    spawnInitialTraffic() {
        // gera poucos carros iniciais, bem espaçados à frente do player
        const initialCount = 6; // ajuste: 3-8 é um bom range
        let z = this.camera.z + 800; // começa um pouco à frente do player

        for (let i = 0; i < initialCount; i++) {
            // escolhe sprite e faixa lateral
            const key = Phaser.Utils.Array.GetRandom(this.trafficCarKeys);
            const offsetX = Phaser.Math.FloatBetween(-0.9, 0.9);
            const speed = Phaser.Math.FloatBetween(80, 160);

            // adiciona com espaçamento aleatório (800..1600)
            this.addCar(key, z + Phaser.Math.Between(0, 800), offsetX, speed);

            // incrementa z para o próximo spawn (evita empilhar)
            z += Phaser.Math.Between(900, 1600);
        }
    }


    trySpawnTraffic() {
        const now = Date.now();

        // respeita intervalo entre spawns
        if (now - this.lastTrafficSpawnTime < this.spawnInterval) return;

        // limite máximo de carros
        if (this.traffic.length >= this.maxTraffic) return;

        // escolhe um Z para spawn a certa distância à frente do player
        const playerZ = this.camera.z;
        const spawnZ = playerZ + Phaser.Math.Between(this.trafficSpawnAhead * 0.8, this.trafficSpawnAhead * 1.4);

        // evita spawn muito próximo do jogador (em segmentos)
        if (spawnZ - playerZ < 4000) return;

        // evita spawn em cima de outros carros (minGap)
        for (const c of this.traffic) {
            if (Math.abs(c.z - spawnZ) < this.trafficMinGap) return;
        }

        // escolhe sprite aleatório e offset lateral em faixas (evita spawn no mesmo exato x)
        const key = Phaser.Utils.Array.GetRandom(this.trafficCarKeys);
        const laneOptions = [-0.9, -0.3, 0.3, 0.9];
        const offsetX = Phaser.Utils.Array.GetRandom(laneOptions);

        // velocidade coerente (NPCs geralmente mais lentos que player)
        const speed = Phaser.Math.FloatBetween(20, 54);

        // cria o carro
        this.addCar(key, spawnZ, offsetX, speed);

        this.lastTrafficSpawnTime = now;
    }


    updateTraffic(delta) {
        const dt = delta / 1000;

        // limpa lista de carros em cada segmento
        for (let i = 0; i < this.segments.length; i++) {
            this.segments[i].cars = [];
        }

        for (let i = this.traffic.length - 1; i >= 0; i--) {
            const car = this.traffic[i];

            // ===== MOVIMENTO RELATIVO (corrigido) =====
            const playerSpeed = (this.playerLogic && typeof this.playerLogic.speed === "number")
                ? this.playerLogic.speed
                : 0;

            // calcule o delta por frame (mantendo coerência com camera.moveZ que usa unidades/frame)
            // usamos (delta / 16.67) para normalizar para "frames a 60fps"
            const frameScale = Math.max(0.0001, delta / 16.67);

            let relativeSpeed = car.speed - playerSpeed;

            // fallback seguro se algo der errado
            if (!isFinite(relativeSpeed)) relativeSpeed = car.speed;

            // aplicar movimento relativo no Z (valores em unidades compatíveis com seu sistema)
            car.z += relativeSpeed * frameScale;

            // remove quando sai da pista (reaproveite/remova sprite)
            if (car.z > this.totalSegments * this.segmentLength + 10000 || car.z < -10000) {
                if (car.sprite) {
                    car.sprite.destroy();
                }
                this.traffic.splice(i, 1);
                continue;
            }

            const segIndex = Math.floor(car.z / this.segmentLength) % this.segments.length;
            const seg = this.segments[segIndex];

            if (!seg) {
                if (car.sprite) car.sprite.setVisible(false);
                continue;
            }

            seg.cars.push(car);
            const curve = seg.curve || 0;
            const centrifugalFactor = 0.01;

            car.x -= (curve * (car.speed / this.playerLogic.maxSpeed))
                * centrifugalFactor * (delta / 16.67);

            // limita posição lateral
            car.x = Phaser.Math.Clamp(car.x, -2.2, 2.2);

            // ======== PROJETAR ========
            const tmpPoint = {
                world: {
                    x: car.x * (this.camera.roadWidth / 2),
                    y: seg.p1.world.y,
                    z: car.z
                },
                camera: { x: 0, y: 0, z: 0 },
                screen: { x: 0, y: 0, w: 0 }
            };

            this.camera.projectPoint(tmpPoint);

            // ======== Desenhar carro ========
            if (isFinite(tmpPoint.screen.x) && isFinite(tmpPoint.screen.y)) {
                // escala baseada no 'w' projetado; ajuste divisor se quiser carros maiores/menores
                const scale = tmpPoint.screen.w / 340;

                car.sprite.x = tmpPoint.screen.x;
                car.sprite.y = tmpPoint.screen.y;
                car.sprite.setScale(Math.max(0.12, scale * 1.2));
                car.sprite.setVisible(true);

                // depth para ordenar (objetos mais embaixo ficam acima)
                car.sprite.setDepth(200000 - tmpPoint.screen.y);
            } else {
                car.sprite.setVisible(false);
            }
        }
    }



    handleCollision(car) {

        // 1. ZERA VELOCIDADE
        this.playerLogic.speed = this.playerLogic.speed * 0.3; // igual Jake: perde 70%

        // 2. EMPURRA O PLAYER PRO LADO
        if (this.playerLogic.xOffset < car.x)
            this.playerLogic.xOffset -= 0.2; // empurra pra esquerda
        else
            this.playerLogic.xOffset += 0.2; // empurra pra direita

        // 3. EMPURRA NPC PARA O OUTRO LADO (efeito OutRun)
        if (car.x < this.playerLogic.xOffset)
            car.x -= 0.3;
        else
            car.x += 0.3;

        // 4. Evita múltiplas colisões no mesmo frame
        //    Faz o NPC "saltar" para trás
        car.z -= 2;

        // 5. (Opcional) Colocar animação ou som
        // this.sound.play("crash");
    }

    addRoadsideObjects() {
        const treeFrequency = 5;  // a cada X segmentos
        const billboardFrequency = 200;

        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];

            // Árvores dos dois lados
            if (i % treeFrequency === 0) {
                seg.sprites.push({
                    source: "collision01",
                    offset: -2.5
                });
                seg.sprites.push({
                    source: "collision01",
                    offset: 2.5
                });
            }

            // Um billboard ocasional
            if (i % billboardFrequency === 0) {
                seg.sprites.push({
                    source: "collision03",
                    offset: 4.8
                });
            }

            if (i % billboardFrequency === 0) {
                seg.sprites.push({
                    source: "collision02",
                    offset: -4.8
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
