const serverUrl = "ws://192.168.0.109:3001"; // Адрес WebSocket-сервера
const ws = new WebSocket(serverUrl);

const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};
let localStream;
let peerConnection;

// Обработка сообщений от WebSocket-сервера
ws.onmessage = async (message) => {
    try {
        // Проверяем тип данных, пришедших от сервера
        let textData;
        if (message.data instanceof Blob) {
            // Преобразуем Blob в строку
            textData = await message.data.text();
        } else {
            textData = message.data;
        }

        console.log("Полученные данные (строка):", textData);

        // Парсим строку как JSON
        const data = JSON.parse(textData);
        console.log("Распарсенные данные:", data);

        // Обработка сообщения
        if (data.type === "offer") {
            peerConnection = createPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            ws.send(JSON.stringify({ type: "answer", answer }));
        } else if (data.type === "answer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === "candidate") {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    } catch (error) {
        console.error("Ошибка парсинга JSON:", error.message, "Полученные данные:", message.data);
    }
};


// Обработчик кнопки для начала звонка
document.getElementById("start-call").addEventListener("click", async () => {
    try {
        // Запрашиваем доступ к микрофону
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Выводим локальный аудио-поток (для проверки)
        const localAudio = document.createElement("audio");
        localAudio.srcObject = localStream;
        localAudio.autoplay = true;
        document.body.appendChild(localAudio);

        // Создаём PeerConnection
        peerConnection = createPeerConnection();

        // Добавляем локальный стрим в PeerConnection
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        // Создаём и отправляем offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        ws.send(JSON.stringify({ type: "offer", offer }));
    } catch (error) {
        console.error("Ошибка при доступе к микрофону:", error);
    }
});

// Создаём WebRTC соединение
function createPeerConnection() {
    const pc = new RTCPeerConnection(configuration);

    // Отправляем ICE-кандидатов через WebSocket
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };

    // Получаем аудио-поток от другого клиента
    pc.ontrack = (event) => {
        console.log("Получен удалённый аудио-поток");
        const remoteAudio = document.createElement("audio");
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.autoplay = true;
        document.body.appendChild(remoteAudio);
    };

    return pc;
}
