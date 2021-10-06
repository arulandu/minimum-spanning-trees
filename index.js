// Math
class Vector2 {
    constructor(x, y){
        this.x = x
        this.y = y
    }
}

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

canvas.width = 1280
canvas.height = 720

// World
class World {
    constructor(ww, wh, wc){
        this.ww = ww
        this.wh = wh
        this.wc = wc
        this.bl = new Vector2(this.wc.x - this.ww/2., this.wc.y - this.wh/2.)
        this.tr = new Vector2(this.wc.x + this.ww/2., this.wc.y + this.wh/2.)
        this.aspect = this.ww/this.wh
    }
}
const world = new World(16./9., 1., new Vector2(0., 0.))

const worldToScreen = (pt) => {
    return new Vector2(
        (pt.x-world.wc.x+world.ww/2.)*canvas.width/world.ww,
        canvas.height-(pt.y-world.wc.y+world.wh/2.)*canvas.height/world.wh
    )
}

const screenToWorld = (pt) => {
    return new Vector2(
        pt.x*world.ww/canvas.width+world.wc.x-world.ww/2.,
        world.wc.y+world.wh/2. - pt.y*(world.wh/canvas.height)
    )
}

// Mouse
class Mouse {
    constructor(pos){
        this.pos = pos
        this.isDown = false
    }
}
const mouse = new Mouse(new Vector2(0., 0.))

window.addEventListener('mousemove', (e) => {
    let rect = canvas.getBoundingClientRect()
    mouse.pos.x = (e.clientX - rect.left)*canvas.width / rect.width;
    mouse.pos.y = (e.clientY - rect.top)*canvas.height / rect.height;
})

window.addEventListener('mousedown', (e) => {
    mouse.isDown = true
})

window.addEventListener('mouseup', (e) => {
    mouse.isDown = false
})

// Draw
const drawBackground = (c) => {
    ctx.fillStyle = c
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

const drawLine = (pt1, pt2) => {
    pt1 = worldToScreen(pt1)
    pt2 = worldToScreen(pt2)

    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y)
    ctx.lineTo(pt2.x, pt2.y)
    ctx.fill()
    ctx.stroke()
}

const drawCircle = (pt, r) => {
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, r, 0, 2*Math.PI)
    ctx.fill()
    ctx.stroke()
}

// Sim
class Point {
    constructor(pos, color){
        this.pos = pos
        this.color = color
        this.isMoving = false
        this.dragRad = 20.
    }

    update(){
        if(mouse.isDown){
            let screenPos = worldToScreen(this.pos)
            let sqDist = Math.pow(mouse.pos.x-screenPos.x, 2.)+Math.pow(mouse.pos.y-screenPos.y, 2.)
            if(sqDist < Math.pow(this.dragRad, 2.)){
                this.isMoving = true
            }
        }

        if(this.isMoving && !mouse.isDown){
            this.isMoving = false;
        }
    
        if(this.isMoving){
            this.pos = screenToWorld(mouse.pos)
        }
    }

    draw() {
        let screenPos = worldToScreen(this.pos)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.strokeStyle = 'transparent'
        drawCircle(screenPos, this.dragRad)
        ctx.fillStyle = this.color
        ctx.strokeStyle = 'transparent'
        drawCircle(screenPos, 5)
        
    }
}

const points = ((n) => {
    const randRange = (l, r) => {
        return Math.random()*(r-l) + l
    }
    let points = []
    for(let i = 0; i < n; i++){
        points.push(
            new Point(
                new Vector2(
                    randRange(world.bl.x, world.tr.x), 
                    randRange(world.bl.y, world.tr.y)
                ),
                'red'
            )
        )
    }
    return points
})(100)

const draw = (e) => {
    const kruskals_mst = (points) => {
        let parent = []
        let rank = [];

        const make_set = (v) => {
            parent[v] = v;
            rank[v] = 0;
        }

        const find_set = (v) => {
            if (v == parent[v])
                return v;
            parent[v] = find_set(parent[v]);
            return parent[v]
        }

        const union_sets = (a, b) => {
            a = find_set(a);
            b = find_set(b);
            if (a != b) {
                if (rank[a] < rank[b]){
                    let t = a
                    a = b
                    b = t
                }
                parent[b] = a;
                if (rank[a] == rank[b])
                    rank[a]++;
            }
        }

        class Edge {
            constructor(u, v, weight){
                this.u = u
                this.v = v
                this.weight = weight
            }
        }

        let edges = [];
        for(let i = 0; i < points.length; i++){
            for(let j = i+1; j < points.length; j++){
                let dist = Math.pow(points[i].pos.x-points[j].pos.x, 2.)+Math.pow(points[i].pos.y-points[j].pos.y, 2.)
                edges.push(new Edge(i, j, dist))
            }
        }

        let cost = 0;
        let mst = [];
        for(let i = 0; i < points.length; i++){
            parent.push(0)
            rank.push(0)
        }

        for (let i = 0; i < points.length; i++){
            make_set(i);
        }

        edges.sort((a, b) => {
            return a.weight < b.weight ? -1 : 1
        });

        for (let e of edges) {
            if (find_set(e.u) != find_set(e.v)) {
                cost += e.weight;
                mst.push(e);
                union_sets(e.u, e.v);
            }
        }

        return { mst, cost }
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawBackground('black')

    const { mst, cost } = kruskals_mst(points)

    for(let p of points){
        for(let p1 of points){
            ctx.globalAlpha = 0.05
            ctx.strokeStyle = 'blue'
            ctx.lineWidth = 1
            drawLine(p.pos, p1.pos)
        }
    }

    for(let e of mst){
        ctx.globalAlpha = 1
        ctx.strokeStyle = 'teal'
        ctx.lineWidth = 2
        drawLine(points[e.u].pos, points[e.v].pos)
    }

    for(let p of points){
        p.update()
        p.draw()
    }

    window.requestAnimationFrame(draw)
}

draw()
