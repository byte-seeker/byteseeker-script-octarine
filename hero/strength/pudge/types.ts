export interface EnemyTracker {
	lastX: number
	lastY: number
	lastZ: number
	lastTime: number
	samples: VelocitySample[]
}

export interface VelocitySample {
	vx: number
	vy: number
	time: number
}
