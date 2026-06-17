# Test Prosedürü — ESP32-C3 Medikal Takip Sistemi

## 1. Donanım Bağlantı Kontrolü

| Pin | Baglanti | Dogru mu? |
|-----|----------|-----------|
| 5   | OLED SDA | [ ] |
| 6   | OLED SCL | [ ] |
| 5-6 | BME280 SDA/SCL (ortak I2C) | [ ] |
| 10  | MQ-2 Dijital Cikis | [ ] |
| 3   | 5V Role (LOW=AKTIF) | [ ] |
| 4   | INMP441 WS (LRCLK) | [ ] |
| 7   | INMP441 SCK (BCLK) | [ ] |
| 8   | INMP441 SD (DOUT) | [ ] |

## 2. Derleme ve Yükleme

```bash
# PlatformIO ile derle
pio run

# Yukle
pio run --target upload

# Seri monitor
pio device monitor
```

## 3. Test Adimlari

### 3.1 Baslangic Testi
- [ ] OLED'de "WI-FI BAGLANIYOR" yazisi goruluyor
- [ ] Nokta animasyonu calisiyor (500ms'de bir)
- [ ] WiFi baglaninca IP adresi 3sn goruntuleniyor
- [ ] Normal moda gecince sicaklik ve nem goruntuleniyor

### 3.2 WiFi/MQTT Kesilme Testi
- [ ] Modemi kapat -> OLED'de "BAGLANTI KOPTU" yazisi goruluyor
- [ ] 3sn sonra ekran kapaniyor
- [ ] Modemi ac -> baglanti geri gelince ekran normale donuyor

### 3.3 Gaz Alarm Testi
- [ ] MQ-2 pinini GND'ye cek (gaz simulasyonu)
- [ ] Role LOW'a cekiyor (rolenin tik sesi duyulmali)
- [ ] OLED 5 kez "TEHLIKE!" flash'i yapiyor
- [ ] Lokal MQTT'ye alarm mesaji gidiyor (MQTT Explorer ile kontrol)
- [ ] MQ-2 pinini serbest birak -> role HIGH'a donuyor, ekran normale donuyor

### 3.4 Adafruit IO Testi
- [ ] Adafruit IO dashboard'da sicaklik/nem/basinc verileri gorunuyor
- [ ] Veriler 5sn'de bir guncelleniyor

### 3.5 Lokal MQTT Testi (MQTT Explorer)
- [ ] Konu: `enderak/medikal/set1` -> her 1sn'de veri geliyor
- [ ] Format: `25.3,45.0,1012.5,12.34,32.1,123456`
- [ ] Konu: `enderak/medikal/alarm` -> gazda mesaj geliyor

### 3.6 BLE Testi (nRF Connect veya benzeri uygulama)
- [ ] Cihaz adi "ESP32C3_MEDIKAL" gorunuyor
- [ ] Baglaninca karakteristik okunabiliyor
- [ ] Servis UUID: `4fa28cd0-e1dd-450b-a652-3213c4c92b9d`
- [ ] "1" yazinca role aktif, "0" yazinca role pasif

### 3.7 Dayaniklilik Testi
- [ ] 24 saat kesintisiz calisma
- [ ] Heap bellek azalmasi kontrolu (Serial monitorden izle)
- [ ] Sicaklik 75C uzerinde sistem restart (simule edilebilir)
- [ ] Heap < 30KB'de sistem restart

## 4. Debug

Seri monitor ciktisi:
```
[WiFi] Baglandi! IP: 192.168.x.x
[Lokal MQTT] Baglandi
[AIO MQTT] Baglandi
[BLE] Servis baslatildi
[Telemetri] 25.3,45.0,1012.5,12.34,32.1,123456
```

## 5. Sık Karşılaşılan Sorunlar

| Sorun | Cozum |
|-------|-------|
| BME280 bulunamadi | I2C adresini kontrol et (0x76/0x77), kablolamayi kontrol et |
| WiFi baglanmiyor | SSID/sifre kontrol, modem frekansi 2.4GHz olmali |
| Lokal MQTT baglanmiyor | Broker calisiyor mu? IP dogru mu? Port 1883 acik mi? |
| Ses seviyesi 0 geliyor | I2S pinlerini kontrol et, INMP441 beslemesini kontrol et |
