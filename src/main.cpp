#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <driver/i2s.h>

#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <Preferences.h>
#include <Update.h>
#include <math.h>

#define FIRMWARE_VERSION "1.0.0"

// --- Pinler ---
#define SDA_PIN      5
#define SCL_PIN      6
#define MQ2_PIN      10
#define MQ2_AO_PIN   1
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
const unsigned long Z_AIO       = 30000;
const unsigned long Z_VERCEL    = 5000;
const unsigned long Z_RECONNECT = 5000;
const unsigned long Z_LOST_EKRAN= 3000;
const unsigned long Z_IP_EKRAN  = 3000;
const unsigned long Z_NOKTA     = 500;
const unsigned long Z_SAYFA     = 3000;
const unsigned long Z_OTA_KONTROL = 60000;

extern char cihazID[];
extern char cihazMAC[];

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
unsigned long tSon_vercel    = 0;
unsigned long tSon_reconnect = 0;
unsigned long tSon_aioReconnect = 0;
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
bool gazAlarm      = false;
bool alarmGonderildi = false;
bool noktaDurum    = false;
bool baglantiOldu  = false;
bool flashRenk     = false;
bool otaGuncelleniyor = false;
int  ekranSayfa    = 0;
unsigned long tSon_ekranSayfa = 0;
unsigned long tSon_otaKontrol = 0;

float sicaklik   = 0;
float nem        = 0;
float basinc     = 0;
float cpuIsi     = 0;
float sesSeviye  = 0;
uint32_t bosRam  = 0;
int    gazGenel  = 0;

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
    static int sira = 0;
    if (++sira % 5 == 0 && adet > 0) {
        Serial.printf("[I2S] ilk 4: %d %d %d %d\n", buf[0], buf[1], buf[2], buf[3]);
    }
    double toplam = 0;
    for (int i = 0; i < adet; i++) {
        double s = (double)(buf[i] >> 8) / 8388608.0;
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

    if (gazDurum == LOW && !gazAlarm) {
        gazAlarm = true;
        alarmGonderildi = false;
        digitalWrite(RELAY_PIN, LOW);
        Serial.println("[ALARM] GAZ KACAGI TESPIT EDILDI!");
    }

    if (gazDurum == HIGH && gazAlarm) {
        gazAlarm = false;
        digitalWrite(RELAY_PIN, HIGH);
        u8g2.setPowerSave(0);
        ekranKapali = false;
        lostDurum = false;
        Serial.println("[ALARM] Gaz tehlikesi gecti");
    }

    if (gazAlarm && !alarmGonderildi) {
        if (lokalMQTT.connected()) {
            lokalMQTT.publish(LOKAL_TOPIC_ALARM, "GAZ KACAGI - ACIL DURUM");
            Serial.println("[MQTT] Alarm mesaji gonderildi");
        }
        alarmGonderildi = true;
    }
}

// --- OLED Uyari (beyaz ekran + siyah TEHLIKE!) ---
void flashGuncelle() {
    unsigned long now = millis();

    if (gazAlarm && !flashRenk) {
        flashRenk = true;
        tSon_flash = now;
        u8g2.clearBuffer();
        u8g2.drawBox(0, 0, 72, 40);
        u8g2.setDrawColor(0);
        u8g2.setFont(u8g2_font_ncenB10_tr);
        const char* txt = "TEHLIKE!";
        u8g2.setCursor((72 - u8g2.getStrWidth(txt)) / 2, 25);
        u8g2.print(txt);
        u8g2.sendBuffer();
        u8g2.setDrawColor(1);
    }

    if (!gazAlarm && flashRenk && now - tSon_flash >= 2000) {
        flashRenk = false;
    }
}

// --- OLED Ekran (200ms) ---
void oledGuncelle() {
    if (flashRenk) return;
    if (ekranKapali) return;
    if (!normalMod) return;

    if (millis() - tSon_ekranSayfa >= Z_SAYFA) {
        tSon_ekranSayfa = millis();
        ekranSayfa = (ekranSayfa + 1) % 5;
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
    } else if (ekranSayfa == 2) {
        etiket = "BASINC";
        snprintf(deger, sizeof(deger), "%.0f", basinc);
    } else if (ekranSayfa == 3) {
        etiket = "MQ-2";
        snprintf(deger, sizeof(deger), "%d", gazGenel);
    } else {
        etiket = "SES";
        snprintf(deger, sizeof(deger), "%.2f", sesSeviye);
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
    gazGenel = analogRead(MQ2_AO_PIN);
    Serial.printf("[SENSOR] %.1fC %.0f%% %.1fhPa Ses:%.2f CPU:%.1fC RAM:%u Gaz:%d\n",
                  sicaklik, nem, basinc, sesSeviye, cpuIsi, bosRam, gazGenel);

    if (bosRam < 30720) esp_restart();
    if (cpuIsi >= 75.0) esp_restart();
}

// --- Lokal MQTT Gonder (1 sn) ---
void lokalMQTTGonder() {
    if (!lokalMQTT.connected()) return;
    char payload[160];
    snprintf(payload, sizeof(payload), "%s,%.1f,%.1f,%.1f,%.2f,%.1f,%u,%d",
             cihazID, sicaklik, nem, basinc, sesSeviye, cpuIsi, bosRam, gazGenel);
    lokalMQTT.publish(LOKAL_TOPIC_TELEM, payload);
}

// --- Adafruit IO Gonder (5 sn) ---
void aioGonder() {
    if (!aioMQTT.connected()) return;
    aioMQTT.publish(AIO_TOPIC_SICAKLIK, String(sicaklik, 1).c_str());
    aioMQTT.publish(AIO_TOPIC_NEM, String(nem, 0).c_str());
    aioMQTT.publish(AIO_TOPIC_BASINC, String(basinc, 0).c_str());
}

// --- Vercel API Gonder (5 sn) ---
void vercelGonder() {
    HTTPClient http;
    http.begin(VERCEL_API_URL);
    http.addHeader("Content-Type", "application/json");
    char json[512];
    snprintf(json, sizeof(json),
             "{\"device_id\":\"%s\",\"mac\":\"%s\",\"sicaklik\":%.1f,\"nem\":%.1f,\"basinc\":%.1f,\"ses\":%.2f,\"cpu\":%.1f,\"ram\":%u,\"wifiRssi\":%d,\"mqttLokal\":%d,\"mqttAio\":%d,\"gaz_genel\":%d}",
             cihazID, cihazMAC, sicaklik, nem, basinc, sesSeviye, cpuIsi, bosRam,
             WiFi.RSSI(), lokalMQTT.connected() ? 1 : 0, aioMQTT.connected() ? 1 : 0, gazGenel);
    int code = http.POST(json);
    if (code >= 200 && code < 300) {
        Serial.printf("[VERCEL] Veri gonderildi: %d\n", code);
    } else {
        Serial.printf("[VERCEL] Hata: %d\n", code);
    }
    http.end();
}

void otaKontrol() {
    HTTPClient http;
    char url[256];
    snprintf(url, sizeof(url), "%s/api/firmware/check?device_id=%s&current_version=%s",
             "https://kollabeni.vercel.app", cihazID, FIRMWARE_VERSION);
    http.begin(url);
    int code = http.GET();
    if (code != 200) {
        http.end();
        return;
    }
    String body = http.getString();
    http.end();
    if (body.indexOf("\"update_available\":true") < 0) return;

    int vStart = body.indexOf("\"version\":\"");
    int uStart = body.indexOf("\"dosya_url\":\"");
    if (vStart < 0 || uStart < 0) return;
    vStart += 11;
    int vEnd = body.indexOf("\"", vStart);
    uStart += 13;
    int uEnd = body.indexOf("\"", uStart);
    if (vEnd < 0 || uEnd < 0) return;

    String yeniVersion = body.substring(vStart, vEnd);
    String dosyaUrl = body.substring(uStart, uEnd);
    Serial.printf("[OTA] Guncelleme bulundu: v%s -> v%s\n", FIRMWARE_VERSION, yeniVersion.c_str());
    Serial.printf("[OTA] Indiriliyor: %s\n", dosyaUrl.c_str());

    otaGuncelleniyor = true;
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_5x7_tf);
    u8g2.setCursor(0, 10);
    u8g2.print("OTA");
    u8g2.setCursor(0, 25);
    u8g2.print("GUNCELLEME");
    u8g2.setCursor(0, 38);
    u8g2.print(yeniVersion.c_str());
    u8g2.sendBuffer();

    HTTPClient dl;
    dl.begin(dosyaUrl);
    int dlCode = dl.GET();
    if (dlCode != 200) {
        Serial.printf("[OTA] Indirme hatasi: %d\n", dlCode);
        dl.end();
        otaGuncelleniyor = false;
        return;
    }
    int toplamBoyut = dl.getSize();
    if (toplamBoyut <= 0) {
        Serial.println("[OTA] Gecersiz dosya boyutu");
        dl.end();
        otaGuncelleniyor = false;
        return;
    }

    if (!Update.begin(toplamBoyut)) {
        Serial.printf("[OTA] Baslatma hatasi: %s\n", Update.errorString());
        dl.end();
        otaGuncelleniyor = false;
        return;
    }

    WiFiClient* stream = dl.getStreamPtr();
    uint8_t buf[128];
    int yazilan = 0;
    while (dl.connected() && yazilan < toplamBoyut) {
        int okunan = stream->readBytes(buf, (sizeof(buf) < (unsigned)(toplamBoyut - yazilan)) ? sizeof(buf) : (toplamBoyut - yazilan));
        if (okunan == 0) break;
        Update.write(buf, okunan);
        yazilan += okunan;
        int yuzde = (yazilan * 100) / toplamBoyut;
        u8g2.clearBuffer();
        u8g2.setFont(u8g2_font_5x7_tf);
        u8g2.setCursor(0, 10);
        u8g2.print("OTA %");
        u8g2.setCursor(30, 10);
        u8g2.print(yuzde);
        u8g2.setCursor(0, 25);
        u8g2.print(String(yazilan / 1024) + "KB");
        u8g2.setCursor(40, 25);
        u8g2.print("/ " + String(toplamBoyut / 1024) + "KB");
        u8g2.sendBuffer();
    }
    dl.end();

    if (Update.end() && Update.isFinished()) {
        Serial.println("[OTA] Basarili! Yeniden baslatiliyor...");
        u8g2.clearBuffer();
        u8g2.setFont(u8g2_font_5x7_tf);
        u8g2.setCursor(0, 22);
        u8g2.print("GUNCELLEME");
        u8g2.setCursor(0, 35);
        u8g2.print("BASARILI!");
        u8g2.sendBuffer();
        delay(2000);
        esp_restart();
    } else {
        Serial.printf("[OTA] Hata: %s\n", Update.errorString());
        otaGuncelleniyor = false;
    }
}

char cihazID[24];
char cihazMAC[18];

// ===================================================================
void setup() {
    Serial.begin(115200);
    delay(100);
    Serial.println("\n========================================");
    Serial.println("[SISTEM] ESP32-C3 Medikal Takip Basliyor");
    Serial.println("========================================");

    Preferences prefs;
    prefs.begin("kolla", false);
    if (prefs.isKey("device_id")) {
        String stored = prefs.getString("device_id");
        snprintf(cihazID, sizeof(cihazID), "%s", stored.c_str());
        Serial.printf("[SISTEM] Mevcut Cihaz ID: %s\n", cihazID);
    } else {
        uint8_t buf[8];
        for (int i = 0; i < 8; i++) buf[i] = esp_random() & 0xFF;
        char newId[17];
        snprintf(newId, sizeof(newId), "KOLLA-%02X%02X%02X%02X%02X%02X%02X%02X",
                 buf[0], buf[1], buf[2], buf[3], buf[4], buf[5], buf[6], buf[7]);
        prefs.putString("device_id", newId);
        snprintf(cihazID, sizeof(cihazID), "%s", newId);
        Serial.printf("[SISTEM] Yeni Cihaz ID: %s\n", cihazID);
    }
    prefs.end();

    uint8_t mac[6];
    WiFi.macAddress(mac);
    snprintf(cihazMAC, sizeof(cihazMAC), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    Serial.printf("[SISTEM] MAC: %s\n", cihazMAC);

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
    analogReadResolution(12);
    analogSetPinAttenuation(MQ2_AO_PIN, ADC_11db);

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
        if (now - tSon_aioReconnect >= Z_RECONNECT) {
            tSon_aioReconnect = now;
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

    // --- Vercel API Gonderim (5 sn) ---
    if (now - tSon_vercel >= Z_VERCEL) {
        tSon_vercel = now;
        if (normalMod && WiFi.status() == WL_CONNECTED) {
            vercelGonder();
        }
    }

    // --- OTA Kontrol (60 sn) ---
    if (now - tSon_otaKontrol >= Z_OTA_KONTROL) {
        tSon_otaKontrol = now;
        if (normalMod && WiFi.status() == WL_CONNECTED && !otaGuncelleniyor) {
            otaKontrol();
        }
    }

    // --- OLED (200 ms) ---
    if (now - tSon_oled >= Z_OLED) {
        tSon_oled = now;
        oledGuncelle();
    }
}
