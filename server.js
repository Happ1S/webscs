const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });

wss.on("connection", (ws) => {
    console.log("Клиент подключился");

    ws.on("message", (message) => {
        // Рассылаем сообщение всем остальным клиентам
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on("close", () => {
        console.log("Клиент отключился");
    });
});

console.log("WebSocket сервер запущен на ws://192.168.0.109:3000");
