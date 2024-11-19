const serverUrl = "ws://192.168.0.109:3000"; // Адрес WebSocket-сервера
const ws = new WebSocket(serverUrl);

const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};
let localStream;
let peerConnection;

ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "offer") {
        // Создаем PeerConnection и отвечаем на offer
        peerConnection = createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        ws.send(JSON.stringify({ type: "answer", answer }));
    } else if (data.type === "answer") {
        // Устанавливаем answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === "candidate") {
        // Добавляем ICE-кандидата
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

document.getElementById("start-call").addEventListener("click", async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConnection = createPeerConnection();

    // Добавляем локальный стрим
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    // Отправляем offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    ws.send(JSON.stringify({ type: "offer", offer }));
});

function createPeerConnection() {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };

    pc.ontrack = (event) => {
        const audio = document.createElement("audio");
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        document.body.appendChild(audio);
    };

    return pc;
}
