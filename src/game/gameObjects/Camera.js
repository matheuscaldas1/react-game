export default class Camera {
    constructor({
        x = 0,
        y = 1500,
        z = 0,
        depth = 1.2,
        roadWidth = 2000,
        screenWidth = 800,
        screenHeight = 600
    } = {}) {
        this.x = x
        this.y = y
        this.z = z
        this.depth = depth

        this.roadWidth = roadWidth
        this.screenWidth = screenWidth
        this.screenHeight = screenHeight
    }

    moveZ(speed) {
        this.z += speed
    }

    moveX(amount) {
        this.x += amount
    }

    moveY(amount) {
        this.y += amount
    }

    projectPoint(point) {
        if (!point.screen) point.screen = { x: 0, y: 0, w: 0 };

        const dx = point.world.x - this.x;
        const dy = point.world.y - this.y;
        const dz = point.world.z - this.z;

        const depth = Math.max(0.01, dz);
        const scale = this.depth / depth;

        point.camera.x = dx;
        point.camera.y = dy;
        point.camera.z = dz;

        point.screen.x = Math.round(
            (1 + point.camera.x * scale) * this.screenWidth / 2
        );
        point.screen.y = Math.round(
            (1 - point.camera.y * scale) * this.screenHeight / 2
        );
        point.screen.w = Math.round(this.roadWidth * scale * this.screenWidth / 2);
    }

}
