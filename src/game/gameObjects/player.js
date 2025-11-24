export default class Player {
    constructor() {
        this.xOffset = 0;
        this.speed = 0;
        this.spriteKey = "player_straight";
        this.yBounce = 0;

        // Configurações de física
        this.maxSpeed = 80;
        this.accelRate = 20;     // aceleração por segundo
        this.brakeRate = 30;     // frenagem por segundo
        this.coastRate = 10;     // desaceleração natural
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
        if (input.left && this.speed > 2.5) this.xOffset -= this.lateralSpeed * dt * 60;
        if (input.right && this.speed > 2.5) this.xOffset += this.lateralSpeed * dt * 60;
        this.xOffset = Phaser.Math.Clamp(this.xOffset, -2.2, 2.2);

        const centrifugalFactor = 0.01;
        const curve = currentSegment.curve || 0;
        this.xOffset -= (curve * this.speed / this.maxSpeed) * centrifugalFactor * (delta / 16.67);

        // ----- Bounce -----
        this.yBounce = (1.5 * Math.random() * (this.speed / this.maxSpeed)) * Phaser.Math.RND.pick([-1, 1]);

        // ----- Sprite -----
        let steer = this.xOffset;
        let updown = currentSegment?.elevation || 0;

        if (steer < -0.1) {
            this.spriteKey = (updown > 0.05) ? "player_uphill_left" : "player_left";
        } else if (steer > 0.1) {
            this.spriteKey = (updown > 0.05) ? "player_uphill_right" : "player_right";
        } else {
            this.spriteKey = (updown > 0.05) ? "player_uphill_straight" : "player_straight";
        }

        const isOnlyUp = input.up && !input.down && !input.left && !input.right;

        if (isOnlyUp) {
            this.spriteKey = (updown > 0.05) ? "player_uphill_straight" : "player_straight";
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
