export default class Player {
    constructor() {
        this.xOffset = 0;
        this.speed = 0;
        this.spriteKey = "player_straight";
        this.yBounce = 0;

        // Configurações de física
        this.maxSpeed = 120;
        this.accelRate = 20; // aceleração por segundo
        this.brakeRate = 30; // frenagem por segundo
        this.coastRate = 10; // desaceleração natural
        this.lateralSpeed = 0.01;
        // offroad
        this.offRoadMaxSpeed = 50;
        this.offRoadAccelRate = 10;
        this.offRoadSlowdown = 8;
    }

    update(input, currentSegment, delta) {
        const dt = delta / 1000; // transforma ms -> segundos para física realista

        const isOffRoad = currentSegment?.isOffRoad === true;

        const maxSpeed = isOffRoad ? this.offRoadMaxSpeed : this.maxSpeed;
        const accelRate = isOffRoad ? this.offRoadAccelRate : this.accelRate;

        if (isOffRoad) {
            this.speed -= this.offRoadSlowdown * dt;
            if (this.speed < 0) this.speed = 0;
        }

        // ----- Velocidade -----

        if (input.up) {
            this.speed += accelRate * dt;
        } else {
            // desaceleração natural se não estiver acelerando
            this.speed -= this.coastRate * dt;
        }

        if (input.down) {
            this.speed -= this.brakeRate * dt;
        }

        // clamp speed
        this.speed = Phaser.Math.Clamp(this.speed, 0, maxSpeed);

        // ----- Movimento lateral -----
        if (input.left && this.speed > 2.5)
            this.xOffset -= this.lateralSpeed * dt * 60;
        if (input.right && this.speed > 2.5)
            this.xOffset += this.lateralSpeed * dt * 60;
        this.xOffset = Phaser.Math.Clamp(this.xOffset, -2.2, 2.2);

        const centrifugalFactor = 0.01;
        const curve = currentSegment.curve || 0;
        this.xOffset -=
            ((curve * this.speed) / this.maxSpeed) *
            centrifugalFactor *
            (delta / 16.67);

        // ----- Bounce -----
        this.yBounce =
            1.5 *
            Math.random() *
            (this.speed / this.maxSpeed) *
            Phaser.Math.RND.pick([-1, 1]);

        // ----- Sprite -----
        const updown = currentSegment?.elevation || 0;

        // zona central (meio da pista)
        const middleThreshold = 0.4;
        const inMiddle = Math.abs(this.xOffset) < middleThreshold;

        // input de direção: -1 = left, 1 = right, 0 = nada
        const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);

        const variant = (name) =>
            updown > 0.05 ? `player_uphill_${name}` : `player_${name}`;

        // Regras aplicadas (prioridade):
        // 1) Se estiver no meio => sempre straight
        // 2) Senão, se estiver pressionando left/right => mostra a sprite correspondente
        // 3) Senão, usa o default da pista:
        //    - se estiver na pista esquerda (xOffset < -threshold) -> mostrar player_right
        //    - se estiver na pista direita (xOffset > threshold) -> mostrar player_left
        if (inMiddle) {
            this.spriteKey = variant("straight");
        } else if (steerInput < 0) {
            // apertou para a esquerda
            this.spriteKey = variant("left");
        } else if (steerInput > 0) {
            // apertou para a direita
            this.spriteKey = variant("right");
        } else {
            // sem input: escolher pelo lado da pista (inverso conforme pedido)
            if (this.xOffset < 0) {
                // está na pista esquerda -> sprite deve parecer que vira para a direita
                this.spriteKey = variant("right");
            } else {
                // está na pista direita -> sprite deve parecer que vira para a esquerda
                this.spriteKey = variant("left");
            }
        }
    }

    checkTrafficCollision(trafficCars) {
        const playerX = this.xOffset;
        const playerW = 0.4; // largura lógica do carro do player

        for (let npc of trafficCars) {
            const dx = playerX - npc.x;
            const overlap = Math.abs(dx) < (playerW + npc.width) * 0.5;

            if (overlap) {
                return npc; // Retorna referência ao carro que colidiu
            }
        }

        return null;
    }
}

