export default class RoadSegment {
    constructor(index, worldZ, curve = 0, elevation = 0) {
        this.index = index
        this.worldZ = worldZ
        this.curve = curve
        this.elevation = elevation
        this.sprites = []

        this.p1 = {
            world: { x: 0, y: 0, z: 0 },
            camera: {},
            screen: { x: 0, y: 0, w: 0 }
        }
        this.p2 = {
            world: { x: 0, y: 0, z: 0 },
            camera: {},
            screen: { x: 0, y: 0, w: 0 }
        }

        this.color = {
            road: 0x404040,
            grass: (Math.floor(index / 3) % 2 === 0 ? 0x2E2157 : 0x241734),
            rumble: (Math.floor(index / 3) % 2 === 0 ? 0xF706CF : 0xFD1D53),
            lane: 0x2DE2D6,
        }
    }

    setWorldZ(segmentLength) {
        this.p1.world.z = this.index * segmentLength
        this.p2.world.z = (this.index + 1) * segmentLength
    }
}

