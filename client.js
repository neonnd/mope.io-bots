// ==UserScript==
// @name         Mope.io free bots
// @namespace    OP-Bots free
// @version      1.0.0
// @description  Mope.io bots
// @author       SizRex, Neon, NuclearC, Maf1oZRex, MrShadow, Xenon -> OP Bots Team
// @match        *://mope.io/*
// @grant        none
// ==/UserScript==

((target) => {

    class config {
         constructor() {
             this.server = null;
             this.ws = null;
         }
         connect() {
             this.ws = new WebSocket("ws://127.0.0.1:5000");
             this.ws.binaryType = "arraybuffer";
             this.ws.onopen = this.open.bind(this);
             this.ws.onclose = this.close.bind(this);
             this.ws.onerror = this.error.bind(this);
             this.ws.onmessage = this.message.bind(this);
         }
         open() {
 
         }
         close() {
             this.connect();
         }
         error() {
 
         }
         message(msg) {}
         send(buf) {
             if(this.ws && this.ws.readyState == 1) this.ws.send(buf);
         }
         createBuffer(len) {
             return new DataView(new ArrayBuffer(len));
         }
         sendServer() {
             let buf = this.createBuffer(2 + this.server.length);
             let offset = 0;
             buf.setUint8(offset++, 0);
             for(let i = 0; i < this.server.length; i++) {
                 buf.setUint8(offset++, this.server.charCodeAt(i))
             };
             buf.setUint8(offset++, 0)
             this.send(buf);
         }
         getRecaptchaToken() {
 
             window.grecaptcha.execute("6Le2eLIZAAAAACYfDXc6fT__SyfOP0m7rNyjkJdR", {action: `homepage`}).then(token => {
                 let buf = this.createBuffer(2 + token.length);
                 let offset = 0;
                 buf.setUint8(offset++, 2);
                 for(let i = 0; i < token.length; i++) {
                     buf.setUint8(offset++, token.charCodeAt(i))
                 };
                 buf.setUint8(offset++, 0)
                 this.send(buf);
             });
             setTimeout(() => {
                 this.getRecaptchaToken();
             }, 500);
         }
     }
 
     target.normalizeBuffer = (buf) => {
         buf = new Uint8Array(buf);
         let newBuf = new DataView(new ArrayBuffer(buf.byteLength));
         for(let i = 0; i < buf.byteLength; i++) {
             newBuf.setUint8(i, buf[i])
         }
         return newBuf;
     }
 
     target.WebSocket.prototype._sniff = target.WebSocket.prototype.send;
     target.WebSocket.prototype.send = function() {
         this._sniff.apply(this, arguments);
         if(this.url.includes("wss://")) {
             console.log(new Uint8Array(arguments[0]) + "");
             let buf = normalizeBuffer(arguments[0]);
             let offset = 0;
             switch(buf.getUint8(offset++)) {
                 case 5:
                 {
                     target.config.send(buf);
                 } break;
             }
             if(target.config.server != this.url) {
                 target.config.server = this.url;
                 target.config.sendServer();
             }
         }
     }
 
 
     target.config = new config();
     target.config.connect();
     setTimeout(() => {
         target.config.getRecaptchaToken();
     }, 5000);
 
 })(window)
