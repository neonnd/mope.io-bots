const WebSocket = require("ws");
const request = require("request-promise");
const proxyagent = require("proxy-agent");

const botsAmount = 500;

let int = null;
let proxy = null;
let bots = [];


const getProxy = () => {
    request.get("https://api.proxyscrape.com/?request=getproxies&proxytype=socks4&timeout=10000&country=all").then(proxies => {
        proxy = proxies.split("\n");
        console.log(`${proxy.length} successfully loaded proxy`);
        initServer();
    })
};

getProxy();

const initServer = () => {
    console.log("Server started")
    const Server = new WebSocket.Server({
        port: 5000
    });
    
    Server.on("connection", ws => {
        console.log("Client successfully connected")
        ws.on("message", msg => {
            msg = Buffer.from(msg);
            let offset = 0;
            switch (msg.readUInt8(offset++)) {
                case 0:
                    {
                        let byte;
                        let server = "";
                        while ((byte = msg.readUInt8(offset++)) != 0) {
                            server += String.fromCharCode(byte);
                        }
                        console.log(`starting bots ${server}`)
                        startBots(server);
                    } break;
                case 1:
                    {
                        destroyBots();
                    } break;
                case 2:
                    {
                        let byte;
                        let token = "";
                        while ((byte = msg.readUInt8(offset++)) != 0) {
                            token += String.fromCharCode(byte);
                        }
                        recaptchaTokens.addToken(token);
                    } break;
                case 5:
                    {
                        moveBots(msg.readInt16BE(1), msg.readInt16BE(3))
                    } break;
            }
        });
        ws.on("close", e => {
            destroyBots();
        });
        ws.on("error", e => {
            destroyBots();
        });
    });
}

const startBots = (server) => {
    destroyBots();
    for (let i = 0; i < botsAmount; i++) {
        bots.push(new bot(i, server));
    }
    let b = 0;
    int = setInterval(() => {
        let aliveBots = 0;
        for(let i in bots) if(!bots[i].inConnect && !bots[i].closed) aliveBots++;
        console.clear();
        console.log(`Server: ${server} | Alive Bots: ${aliveBots}`);
        b++;
        if (b > botsAmount) b = 0;
        if (bots[b] && !bots[b].inConnect && bots[b].closed) bots[b].connect();
    }, 100);
}

const destroyBots = () => {
    clearInterval(int);
    for (let i in bots) {
        if (bots[i] && bots[i].ws) bots[i].ws.close();
    };
    bots = [];
}

const moveBots = (x, y) => {
    for (let i in bots) {
        bots[i].move(x, y);
    };
}

class bot {
    constructor(id, server) {
        this.id = id;
        this.ws = null;
        this.server = server;
        this.botNick = ["SizRex YT", "Free bots"];
        this.inConnect = false;
        this.closed = true;
        this.int = null;
    }
    connect() {
        this.inConnect = true;
        this.ws = new WebSocket(this.server, {
            agent: new proxyagent(`socks4://${proxy[(~~(Math.random() * proxy.length))]}`)
        });
        this.ws.binaryType = "nodebuffer";
        this.ws.onopen = this.open.bind(this);
        this.ws.onclose = this.close.bind(this);
        this.ws.onerror = this.error.bind(this);
        this.ws.onmessage = this.message.bind(this);
    }
    open() {
        this.inConnect = false;
        this.closed = false;
        this.send(Buffer.from([1,0,10,112,181,0]))
        this.send(Buffer.from([2,1,0,0,7,128,3,169,1,0,0]));
        this.send(Buffer.from([17,7,80,3,196]));
    }
    spawn() {
        let nick = `${this.id}`;
        let buf = [2, 0, 0, nick.length];
        for (let i in nick) {
            buf.push(nick.charCodeAt(i));
        }
        buf.push(7, 80, 3, 206, 1, 0, 0);
        this.send(Buffer.from(buf));
        this.send(Buffer.from([24, 0]));
    }
    move(x, y) {
        let buf = new Buffer.alloc(5);
        let offset = 0;
        buf.writeUInt8(5, offset++);
        let randX = 0;
        (Math.random() >= 0.5) ? randX += ~~(Math.random() * ~~(Math.random() * 150) + (-~~(Math.random() * 150)) + ~~(Math.random() * 150)) : randX -= ~~(Math.random() * ~~(Math.random() * 150) + (-~~(Math.random() * 150)) + ~~(Math.random() * 150))
        let randY = 0;
        Math.random() >= 0.5 ? randY += ~~(Math.random() * ~~(Math.random() * 150) + (-~~(Math.random() * 150)) + ~~(Math.random() * 150)) : randY -= ~~(Math.random() * ~~(Math.random() * 150) + (-~~(Math.random() * 150)) + ~~(Math.random() * 150))
        buf.writeInt16BE(x + randX, offset);
        offset += 2;
        buf.writeInt16BE(y + randY, offset);
        this.send(buf);
    }
    close() {
        clearInterval(this.int);
        this.inConnect = false;
        this.closed = true;
    }
    error() {
        clearInterval(this.int);
        this.inConnect = false;
        this.closed = true;
    }
    message(msg) {
        msg = Buffer.from(msg.data);
        let offset = 0;
        switch (msg.readUInt8(offset++)) {
            case 63:
                let secret = msg.readUInt32BE(offset).toString();
                offset += 4;
                let bytes = [63, 0, 22, 104, 116, 116, 112, 115, 58, 47, 47, 109, 111, 112, 101, 46, 105, 111, 47, 124];
                for (let i = 0; i < secret.length; i++) {
                    bytes.push(secret.charCodeAt(i));
                }
                bytes.push(0);
                this.send(Buffer.from(bytes));
                this.send(Buffer.from([62, 0, 5, 49, 49 + ~~(Math.random() * 9), 49 + ~~(Math.random() * 9), 49 + ~~(Math.random() * 9), 49, 0]));
                break;
            case 64:
                this.requestRecaptcha();
                break;
        }
    }
    requestRecaptcha() {
        let token = recaptchaTokens.getToken();
        if (token) this.sendRecaptchaResponse(token);
    }
    sendRecaptchaResponse(token) {
        let bytes = [64, 1, 142];
        for (let i = 0; i < token.length; i++) {
            bytes.push(token.charCodeAt(i));
        }
        bytes.push(0);
        this.send(Buffer.from(bytes));
        this.int = setInterval(() => {
            this.spawn();
        }, 1000);
    }
    send(buf) {
        if (this.ws && this.ws.readyState == 1) this.ws.send(Buffer.from(buf));
    }
}


class tokenManager {
    constructor() {
        this.tokens = [];
        this.aliveTime = 120;
    }
    init() {
        setInterval(() => {
            this.checkExpired();
        }, 1000);
    }
    checkExpired() {
        for (let i in this.tokens) {
            if ((Date.now() / 1000) - this.tokens[i].date > this.aliveTime) {
                this.tokens.splice(i, 1);
            }
        }
    }
    getToken() {
        let token = this.tokens.shift();
        if (token && token.token) return token.token;
        return null;
    }
    addToken(token) {
        this.tokens.push({
            date: Date.now() / 1000,
            token: token
        });
    }
}

const recaptchaTokens = new tokenManager();
