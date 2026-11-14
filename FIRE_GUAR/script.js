
// ======================================
// 1. CAU HINH MQTT
// ======================================

const BROKER_URL = "ws://broker.hivemq.com:8000/mqtt";

const MQTT_TOPIC = "ngoc_fire_esp32/sensor";

const CONTROL_TOPIC = "ngoc_fire_esp32/control";

const client = mqtt.connect(BROKER_URL, {
    clientId: "WEB_FIRE_" + Math.random().toString(16).slice(2, 10),
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000
});


// ======================================
// 2. KHOI TAO TRANG THAI
// ======================================

let currentMode = "AUTO";

let fanCommandState = false;
let pumpCommandState = false;


// ======================================
// 3. KHOI TAO BIEU DO
// ======================================

const labels = [];
const gasData = [];
const tempData = [];

const gasCanvas = document.getElementById("gasChart");
const tempCanvas = document.getElementById("tempChart");

const gasChart = new Chart(gasCanvas, {
    type: "line",

    data: {
        labels: labels,

        datasets: [{
            label: "MQ-2 (ADC)",
            data: gasData,
            borderColor: "#f28c00",
            backgroundColor: "rgba(242,140,0,0.15)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#f28c00",
            fill: true,
            tension: 0.3
        }]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,

        scales: {
            x: {
                title: {
                    display: true,
                    text: "Thoi gian"
                }
            },

            y: {
                beginAtZero: true,
                min: 0,
                max: 4095,

                title: {
                    display: true,
                    text: "Gia tri ADC"
                }
            }
        }
    }
});


const tempChart = new Chart(tempCanvas, {
    type: "line",

    data: {
        labels: labels,

        datasets: [{
            label: "Nhiet do (°C)",
            data: tempData,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.15)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#ef4444",
            fill: true,
            tension: 0.3
        }]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,

        scales: {
            x: {
                title: {
                    display: true,
                    text: "Thoi gian"
                }
            },

            y: {
                beginAtZero: true,

                title: {
                    display: true,
                    text: "Nhiet do (°C)"
                }
            }
        }
    }
});


// ======================================
// 4. HAM CAP NHAT BIEU DO
// ======================================

function updateCharts(data) {

    const now = new Date().toLocaleTimeString("vi-VN");

    labels.push(now);

    gasData.push(Number(data.gas));
    tempData.push(Number(data.temperature));

    // Chi giu 20 diem du lieu gan nhat
    if (labels.length > 20) {
        labels.shift();
        gasData.shift();
        tempData.shift();
    }

    gasChart.data.labels = [...labels];
    gasChart.data.datasets[0].data = [...gasData];

    tempChart.data.labels = [...labels];
    tempChart.data.datasets[0].data = [...tempData];

    gasChart.update("none");
    tempChart.update("none");

    console.log("Da cap nhat bieu do:", data);
}


// ======================================
// 5. HAM GUI LENH MQTT
// ======================================

function sendCommand(command) {

    if (client.connected) {

        client.publish(CONTROL_TOPIC, command, function (error) {

            if (error) {
                console.log("Gui lenh that bai:", error);
            } else {
                console.log("Da gui lenh:", command);
            }

        });

    } else {

        console.log("MQTT chua ket noi!");

        alert("MQTT chua ket noi!");

    }
}


// ======================================
// 6. CAP NHAT GIAO DIEN DIEU KHIEN
// ======================================

function updateModeDisplay() {

    document.getElementById("modeStatus").innerText =
        currentMode;

    document.getElementById("autoBtn").classList.toggle(
        "active", currentMode === "AUTO"
    );

    document.getElementById("manualBtn").classList.toggle(
        "active", currentMode === "MANUAL"
    );

    document.getElementById("fanBtn").disabled =
        currentMode !== "MANUAL";

    document.getElementById("pumpBtn").disabled =
        currentMode !== "MANUAL";
}


// ======================================
// 7. NUT AUTO
// ======================================

document.getElementById("autoBtn").addEventListener("click", function () {

    currentMode = "AUTO";

    sendCommand("AUTO");

    updateModeDisplay();

    console.log("Da chuyen sang AUTO");

});


// ======================================
// 8. NUT MANUAL
// ======================================

document.getElementById("manualBtn").addEventListener("click", function () {

    // Lay trang thai gan nhat truoc khi chuyen MANUAL
    fanCommandState =
        document.getElementById("fanStatus").innerText === "ON";

    pumpCommandState =
        document.getElementById("pumpStatus").innerText === "ON";

    currentMode = "MANUAL";

    sendCommand("MANUAL");

    updateModeDisplay();

    console.log("Da chuyen sang MANUAL");

});


// ======================================
// 9. NUT BAT / TAT QUAT
// ======================================

document.getElementById("fanBtn").addEventListener("click", function () {

    if (currentMode !== "MANUAL") return;

    fanCommandState = !fanCommandState;

    sendCommand(fanCommandState ? "FAN_ON" : "FAN_OFF");

    document.getElementById("fanStatus").innerText =
        fanCommandState ? "ON" : "OFF";

});


// ======================================
// 10. NUT BAT / TAT MAY BOM
// ======================================

document.getElementById("pumpBtn").addEventListener("click", function () {

    if (currentMode !== "MANUAL") return;

    pumpCommandState = !pumpCommandState;

    sendCommand(pumpCommandState ? "PUMP_ON" : "PUMP_OFF");

    document.getElementById("pumpStatus").innerText =
        pumpCommandState ? "ON" : "OFF";

});


// ======================================
// 11. KET NOI MQTT
// ======================================

client.on("connect", function () {

    console.log("MQTT ket noi thanh cong!");

    document.getElementById("brokerStatus").innerText =
        "Da ket noi";

    client.subscribe(MQTT_TOPIC, function (err) {

        if (!err) {
            console.log("Da dang ky topic:", MQTT_TOPIC);
        } else {
            console.log("Loi subscribe:", err);
        }

    });

    updateModeDisplay();

});


client.on("reconnect", function () {

    console.log("Dang ket noi lai MQTT...");

});


client.on("error", function (error) {

    console.log("MQTT Error:", error);

});


client.on("offline", function () {

    document.getElementById("brokerStatus").innerText =
        "Mat ket noi";

});


// ======================================
// 12. NHAN DU LIEU TU ESP32
// ======================================

client.on("message", function (topic, message) {

    if (topic !== MQTT_TOPIC) return;

    try {

        const messageText = new TextDecoder().decode(message);

        const data = JSON.parse(messageText);

        console.log("Du lieu nhan:", data);

        // Kiem tra du lieu cam bien
        if (
            !Number.isFinite(Number(data.gas)) ||
            !Number.isFinite(Number(data.temperature)) ||
            !Number.isFinite(Number(data.humidity))
        ) {

            console.log("Du lieu cam bien khong hop le!");

            return;
        }


        // ======================================
        // CAP NHAT GIA TRI CAM BIEN
        // ======================================

        document.getElementById("gasValue").innerText =
            data.gas + " ADC";

        document.getElementById("tempValue").innerText =
            Number(data.temperature).toFixed(1) + " °C";

        document.getElementById("humidityValue").innerText =
            Number(data.humidity).toFixed(1) + " %";


        // ======================================
        // CAP NHAT TRANG THAI THIET BI
        // ======================================

        if (currentMode === "AUTO") {

            fanCommandState = Number(data.fan) === 1;
            pumpCommandState = Number(data.pump) === 1;

            document.getElementById("fanStatus").innerText =
                fanCommandState ? "ON" : "OFF";

            document.getElementById("pumpStatus").innerText =
                pumpCommandState ? "ON" : "OFF";
        }


        // ======================================
        // KIEM TRA CANH BAO
        // ======================================

        const gasAlarm = Number(data.gas) > 2500;

        const tempAlarm = Number(data.temperature) > 50;

        const alarmElement =
            document.getElementById("alarmValue");

        const alertBox =
            document.getElementById("alertBox");


        document.getElementById("gasStatus").innerText =
            gasAlarm ? "Vuot nguong" : "Binh thuong";

        document.getElementById("tempStatus").innerText =
            tempAlarm ? "Vuot nguong" : "Binh thuong";


        let warning = [];

        if (gasAlarm) {
            warning.push("CANH BAO KHI GAS");
        }

        if (tempAlarm) {
            warning.push("CANH BAO NHIET DO");
        }


        if (warning.length > 0) {

            alarmElement.innerText = "DANG CANH BAO";

            alertBox.innerText = warning.join(" | ");

            alertBox.className = "alert danger";

        } else {

            alarmElement.innerText = "HE THONG BINH THUONG";

            alertBox.innerText =
                "HE THONG HOAT DONG BINH THUONG";

            alertBox.className = "alert normal";

        }


        // ======================================
        // CAP NHAT BIEU DO
        // ======================================

        updateCharts(data);

    } catch (error) {

        console.log("Loi xu ly JSON:", error);

    }

});


// ======================================
// 13. KHOI TAO GIAO DIEN
// ======================================

updateModeDisplay();

console.log("FIRE GUARD WEBSITE DA SAN SANG!");
