#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <driver/i2s.h>

#include <WiFi.h>
#include <PubSubClient.h>
#include <math.h>

// --- Pinler ---
#define SDA_PIN      5
#define SCL_PIN      6
#define MQ2_PIN      10
#define RELAY_PIN    3
#define I2S_WS       4
#define I2S_SCK      7
#define I2S_SD       8

#include "config.h"

// --- I2S ---
#define I2S_BUFFER_LEN 64
#define I2S_PORT       I2S_NUM_0

// --- Zamanlayicilar (ms) ---
const unsigned long Z_OLED      = 200;
const unsigned long Z_TELEMETRI = 1000;
const unsigned long Z_LOKAL_MQTT= 1000;
const unsigned long Z_AIO       = 5000;
const unsigned long Z_RECONNECT = 5000;
const unsigned long Z_LOST_EKRAN= 3000;
const unsigned long Z_IP_EKRAN  = 3000;
const unsigned long Z_FLASH     = 100;
const unsigned long Z_NOKTA     = 500;
const unsigned long Z_SAYFA     = 3000;

// --- Nesneler ---
U8G2_SSD1306_72X40_ER_F_HW_I2C u8g2(U8G2_R0);
Adafruit_BME280 bme;
WiFiClient lokalClient;
WiFiClient aioClient;
PubSubClient lokalMQTT(lokalClient);
PubSubClient aioMQTT(aioClient);

// --- Durum Degiskenleri ---
unsigned long tSon_oled      = 0;
unsigned long tSon_telem     = 0;
unsigned long tSon_lokalMqtt = 0;
unsigned long tSon_aio       = 0;
unsigned long tSon_reconnect = 0;
unsigned long tSon_lostEkran = 0;
unsigned long tSon_ipEkran   = 0;
unsigned long tSon_flash     = 0;
unsigned long tSon_nokta     = 0;

bool wifiBagli     = false;
bool lokalBagli    = false;
bool aioBagli      = false;
bool normalMod     = false;
bool ipGosterildi  = false;
bool lostDurum     = false;
bool ekranKapali   = false;
bool flashAktif    = false;
bool gazAlarm      = false;
bool alarmGonderildi = false;
bool noktaDurum    = false;
bool baglantiOldu  = false;
int  flashSayac    = 0;
bool flashRenk     = false;
int  ekranSayfa    = 0;
unsigned long tSon_ekranSayfa = 0;

float sicaklik   = 0;
float nem        = 0;
float basinc     = 0;
float cpuIsi     = 0;
float sesSeviye  = 0;
uint32_t bosRam  = 0;

// --- I2S Baslat ---
bool i2sBaslat() {
    i2s_config_t cfg = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = 16000,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 4,
        .dma_buf_len = I2S_BUFFER_LEN,
        .use_apll = false
    };
    i2s_pin_config_t pin = {
        .bck_io_num = I2S_SCK,
        .ws_io_num = I2S_WS,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = I2S_SD
    };
    if (i2s_driver_install(I2S_PORT, &cfg, 0, NULL) != ESP_OK) return false;
    if (i2s_set_pin(I2S_PORT, &pin) != ESP_OK) return false;
    i2s_set_clk(I2S_PORT, 16000, I2S_BITS_PER_SAMPLE_32BIT, I2S_CHANNEL_MONO);
    return true;
}

float sesOkuRMS() {
    int32_t buf[I2S_BUFFER_LEN];
    size_t okunan = 0;
    if (i2s_read(I2S_PORT, buf, sizeof(buf), &okunan, 50) != ESP_OK || okunan == 0) return 0;
    int adet = okunan / 4;
    if (adet == 0) return 0;
    double toplam = 0;
    for (int i = 0; i < adet; i++) {
        double s = (double)(buf[i] >> 14) / 16384.0;
        toplam += s * s;
    }
    return (float)(sqrt(toplam / adet) * 100.0);
}

// --- BME280 ---
bool bmeBaslat() {
    Wire.begin(SDA_PIN, SCL_PIN);
    for (uint8_t adr = 0x76; adr <= 0x77; adr++) {
        Wire.beginTransmission(adr);
        if (Wire.endTransmission() == 0 && bme.begin(adr)) {
            Serial.printf("[BME280] Bulundu: 0x%X\n", adr);
            return true;
        }
    }
    Serial.println("[BME280] Bulunamadi!");
    return false;
}

float cpuIsiOku() {
    return temperatureRead();
}

// --- WiFi ---
void wifiBaglan() {
    Serial.printf("[WIFI] Baglaniyor: %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_SIFRE);
}

// --- Lokal MQTT ---
void lokalMQTTCallback(char* topic, byte* payload, unsigned int length) {
    String msg;
    for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
    msg.trim();

    if (msg == "1") digitalWrite(RELAY_PIN, LOW);
    else if (msg == "0") digitalWrite(RELAY_PIN, HIGH);
    else if (msg == "STATUS") {
        char buf[128];
        snprintf(buf, sizeof(buf), "%.1f,%.1f,%.1f,%.2f,%.1f,%u,%d",
                 sicaklik, nem, basinc, sesSeviye, cpuIsi, bosRam, gazAlarm ? 1 : 0);
        lokalMQTT.publish(LOKAL_TOPIC_TELEM, buf);
    }
}

void lokalMQTTBaglan() {
    if (lokalMQTT.connect("ESP32C3_Medikal_Lokal")) {
        lokalBagli = true;
        baglantiOldu = true;
        lokalMQTT.subscribe(LOKAL_TOPIC_KOMUT);
        Serial.println("[MQTT] Lokal broker'a baglandi");
    } else {
        lokalBagli = false;
        Serial.printf("[MQTT] Lokal baglanti basarisiz! Kod: %d\n", lokalMQTT.state());
    }
}

// --- Adafruit IO MQTT ---
void aioMQTTBaglan() {
    String id = "ESP32C3_Set1_" + String(random(0, 999));
    if (aioMQTT.connect(id.c_str(), AIO_KULLANICI, AIO_SIFRE)) {
        aioBagli = true;
        Serial.println("[AIO] Adafruit IO'ya baglandi");
    } else {
        aioBagli = false;
        Serial.printf("[AIO] Baglanti basarisiz! Kod: %d\n", aioMQTT.state());
    }
}

// --- Gaz Kesme (non-blocking) ---
void gazKontrol() {
    bool gazDurum = digitalRead(MQ2_PIN);

    // Gaz basladi
    if (gazDurum == LOW && !gazAlarm) {
        gazAlarm = true;
        alarmGonderildi = false;
        flashAktif = true;
        flashSayac = 0;
        flashRenk = false;
        tSon_flash = 0;
        digitalWrite(RELAY_PIN, LOW);
    }

    // Gaz gecti
    if (gazDurum == HIGH && gazAlarm) {
        gazAlarm = false;
        flashAktif = false;
        digitalWrite(RELAY_PIN, HIGH);
        u8g2.setPowerSave(0);
        ekranKapali = false;
        lostDurum = false;
    }

    // Alarm mesaji (tek sefer)
    if (gazAlarm && !alarmGonderildi) {
        Serial.println("[ALARM] GAZ KACAGI TESPIT EDILDI!");
        if (lokalMQTT.connected()) {
            lokalMQTT.publish(LOKAL_TOPIC_ALARM, "GAZ KACAGI - ACIL DURUM");
            Serial.println("[MQTT] Alarm mesaji gonderildi");
        }
        alarmGonderildi = true;
    }
}

// --- OLED Flash (non-blocking, 5 kez) ---
void flashGuncelle() {
    if (!flashAktif) return;

    unsigned long now = millis();
    if (now - tSon_flash >= Z_FLASH) {
        tSon_flash = now;
        flashRenk = !flashRenk;

        if (flashRenk) {
            u8g2.clearBuffer();
            u8g2.setFont(u8g2_font_profont22_tf);
            u8g2.setCursor(0, 28);
            u8g2.print("TEHLIKE!");
            u8g2.sendBuffer();
        } else {
            u8g2.clearBuffer();
            u8g2.sendBuffer();
        }

        flashSayac++;
        if (flashSayac >= 10) {
            flashAktif = false;
            flashSayac = 0;
            ekranKapali = false;
        }
    }
}

// --- OLED Ekran (200ms) ---
void oledGuncelle() {
    if (flashAktif) return;
    if (ekranKapali) return;
    if (!normalMod) return;

    if (millis() - tSon_ekranSayfa >= Z_SAYFA) {
        tSon_ekranSayfa = millis();
        ekranSayfa = (ekranSayfa + 1) % 3;
    }

    u8g2.clearBuffer();

    const char* etiket;
    char deger[16];

    if (ekranSayfa == 0) {
        etiket = "ISI";
        snprintf(deger, sizeof(deger), "%.1f", sicaklik);
    } else if (ekranSayfa == 1) {
        etiket = "NEM";
        snprintf(deger, sizeof(deger), "%.0f", nem);
    } else {
        etiket = "BASINC";
        snprintf(deger, sizeof(deger), "%.0f", basinc);
    }

    u8g2.setFont(u8g2_font_ncenB08_tr);
    u8g2.setCursor((72 - u8g2.getStrWidth(etiket)) / 2, 12);
    u8g2.print(etiket);
    u8g2.setFont(u8g2_font_fub11_tr);
    u8g2.setCursor((72 - u8g2.getStrWidth(deger)) / 2, 35);
    u8g2.print(deger);

    u8g2.sendBuffer();
}

// --- WiFi Bekleme Ekrani ---
void wifiBeklemeEkrani() {
    unsigned long now = millis();
    if (now - tSon_nokta >= Z_NOKTA) {
        tSon_nokta = now;
        noktaDurum = !noktaDurum;
        u8g2.clearBuffer();
        u8g2.setFont(u8g2_font_profont22_tf);
        u8g2.setCursor(0, 20);
        u8g2.print("WI-FI");
        u8g2.setCursor(0, 40);
        u8g2.print("BAGLANIYOR");
        if (noktaDurum) {
            u8g2.setCursor(70, 40);
            u8g2.print(".");
        }
        u8g2.sendBuffer();
    }
}

// --- IP Goster (3 sn) ---
void ipGoster() {
    if (!ipGosterildi) {
        tSon_ipEkran = millis();
        ipGosterildi = true;
        u8g2.clearBuffer();
        u8g2.setFont(u8g2_font_5x7_tf);
        u8g2.setCursor(0, 10);
        u8g2.print("IP Baglandi");
        u8g2.setCursor(0, 25);
        u8g2.print(WiFi.localIP().toString().c_str());
        u8g2.sendBuffer();
    }
    if (ipGosterildi && millis() - tSon_ipEkran >= Z_IP_EKRAN) {
        ipGosterildi = false;
        normalMod = true;
        tSon_ekranSayfa = millis();
    }
}

// --- Baglanti Kaybi Yonetimi ---
void baglantiKaybiKontrol() {
    if (gazAlarm) return;
    if (!baglantiOldu) return;

    bool kayip = (!wifiBagli || !lokalBagli);

    if (kayip && !lostDurum) {
        lostDurum = true;
        tSon_lostEkran = millis();
        ekranKapali = false;
        u8g2.clearBuffer();
        u8g2.setFont(u8g2_font_profont22_tf);
        u8g2.setCursor(0, 20);
        u8g2.print("BAGLANTI");
        u8g2.setCursor(0, 40);
        u8g2.print("KOPTU");
        u8g2.sendBuffer();
    }

    if (kayip && lostDurum && millis() - tSon_lostEkran >= Z_LOST_EKRAN) {
        u8g2.clearBuffer();
        u8g2.sendBuffer();
        u8g2.setPowerSave(1);
        ekranKapali = true;
    }

    if (!kayip && lostDurum) {
        lostDurum = false;
        ekranKapali = false;
        u8g2.setPowerSave(0);
    }
}

// --- Sensor Verilerini Oku ---
void sensorOku() {
    sicaklik = bme.readTemperature();
    nem      = bme.readHumidity();
    basinc   = bme.readPressure() / 100.0F;
    sesSeviye = sesOkuRMS();
    cpuIsi   = cpuIsiOku();
    bosRam   = ESP.getFreeHeap();
    Serial.printf("[SENSOR] %.1fC %.0f%% %.1fhPa Ses:%.2f CPU:%.1fC RAM:%u\n",
                  sicaklik, nem, basinc, sesSeviye, cpuIsi, bosRam);

    if (bosRam < 30720) esp_restart();
    if (cpuIsi >= 75.0) esp_restart();
}

// --- Lokal MQTT Gonder (1 sn) ---
void lokalMQTTGonder() {
    if (!lokalMQTT.connected()) return;
    char payload[128];
    snprintf(payload, sizeof(payload), "%.1f,%.1f,%.1f,%.2f,%.1f,%u",
             sicaklik, nem, basinc, sesSeviye, cpuIsi, bosRam);
    lokalMQTT.publish(LOKAL_TOPIC_TELEM, payload);
}

// --- Adafruit IO Gonder (5 sn) ---
void aioGonder() {
    if (!aioMQTT.connected()) return;
    aioMQTT.publish(AIO_TOPIC_SICAKLIK, String(sicaklik, 1).c_str());
    aioMQTT.publish(AIO_TOPIC_NEM, String(nem, 0).c_str());
    aioMQTT.publish(AIO_TOPIC_BASINC, String(basinc, 0).c_str());
}

// ===================================================================
void setup() {
    Serial.begin(115200);
    delay(100);
    Serial.println("\n========================================");
    Serial.println("[SISTEM] ESP32-C3 Medikal Takip Basliyor");
    Serial.println("========================================");

    pinMode(MQ2_PIN, INPUT);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, HIGH);

    Wire.begin(SDA_PIN, SCL_PIN);

    u8g2.setBusClock(400000);
    u8g2.begin();
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_profont22_tf);
    u8g2.setCursor(0, 20);
    u8g2.print("WI-FI");
    u8g2.setCursor(0, 40);
    u8g2.print("BAGLANIYOR");
    u8g2.sendBuffer();

    bmeBaslat();
    i2sBaslat();

    wifiBaglan();

    lokalMQTT.setServer(LOKAL_MQTT_HOST, LOKAL_MQTT_PORT);
    lokalMQTT.setCallback(lokalMQTTCallback);

    aioMQTT.setServer(AIO_SUNUCU, AIO_PORT);
}

// ===================================================================
void loop() {
    unsigned long now = millis();

    // --- WiFi Yonetimi ---
    if (WiFi.status() != WL_CONNECTED) {
        wifiBagli = false;
        if (now - tSon_reconnect >= Z_RECONNECT) {
            tSon_reconnect = now;
            wifiBaglan();
        }
        wifiBeklemeEkrani();
    } else if (!wifiBagli) {
        wifiBagli = true;
        ipGosterildi = false;
        normalMod = false;
        Serial.printf("[WIFI] Baglandi! IP: %s\n", WiFi.localIP().toString().c_str());
    }

    // IP goster ve 3sn bekle (her dongu kontrol)
    if (wifiBagli && !normalMod) {
        ipGoster();
    }

    // --- Lokal MQTT ---
    if (!lokalMQTT.connected()) {
        if (now - tSon_reconnect >= Z_RECONNECT) {
            tSon_reconnect = now;
            lokalMQTTBaglan();
        }
    }
    lokalMQTT.loop();

    // --- Adafruit IO MQTT ---
    if (WiFi.status() == WL_CONNECTED && !aioMQTT.connected()) {
        if (now - tSon_reconnect >= Z_RECONNECT) {
            tSon_reconnect = now;
            aioMQTTBaglan();
        }
    }
    aioMQTT.loop();

    // --- Gaz ve Alarm ---
    gazKontrol();
    flashGuncelle();
    baglantiKaybiKontrol();

    // --- Sensor Okuma (1 sn) ---
    if (now - tSon_telem >= Z_TELEMETRI) {
        tSon_telem = now;
        if (normalMod) {
            sensorOku();
        }
    }

    // --- Lokal MQTT Gonderim (1 sn) ---
    if (now - tSon_lokalMqtt >= Z_LOKAL_MQTT) {
        tSon_lokalMqtt = now;
        if (normalMod) {
            lokalMQTTGonder();
        }
    }

    // --- Adafruit IO Gonderim (5 sn) ---
    if (now - tSon_aio >= Z_AIO) {
        tSon_aio = now;
        if (normalMod && aioBagli) {
            aioGonder();
        }
    }

    // --- OLED (200 ms) ---
    if (now - tSon_oled >= Z_OLED) {
        tSon_oled = now;
        oledGuncelle();
    }
}
