export default class Background {

    constructor(one, two, three, four, five, six) {
        this.layers = [
            { image: one, speed: 0.02 },
            { image: two, speed: 0.05 },
            { image: three, speed: 0.10 },
            { image: four, speed: 0.12 },
            { image: five, speed: 0.15 },
            { image: six, speed: 0.20 },
        ];
    }

    draw(ctx, width, height, cameraX) {
        this.layers.forEach(layer => {
            const scrollX = (cameraX * layer.speed) % 1;

            const img = layer.image.getSourceImage();

            const drawX1 = -scrollX * width;
            const drawX2 = drawX1 + width;

            ctx.drawImage(img, drawX1, 0, width, height);
            ctx.drawImage(img, drawX2, 0, width, height);
        });
    }
}
