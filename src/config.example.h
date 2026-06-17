#pragma once

// --- WiFi ---
const char* WIFI_SSID   = "Birtane";
const char* WIFI_SIFRE  = "tarak5454";

// --- Lokal MQTT Broker ---
const char* LOKAL_MQTT_HOST     = "192.168.1.15";
const int   LOKAL_MQTT_PORT     = 1883;
const char* LOKAL_TOPIC_TELEM   = "enderak/medikal/set1";
const char* LOKAL_TOPIC_ALARM   = "enderak/medikal/alarm";
const char* LOKAL_TOPIC_KOMUT   = "enderak/medikal/komut";

// --- Adafruit IO (Cloud) ---
const char* AIO_SUNUCU    = "io.adafruit.com";
const int   AIO_PORT      = 1883;
// Buraya kendi bilgilerinizi girin:
const char* AIO_KULLANICI = "kullanici_adiniz";
const char* AIO_SIFRE     = "aio_xxxx...";
const char* AIO_TOPIC_SICAKLIK = "kullanici_adiniz/feeds/sicaklik";
const char* AIO_TOPIC_NEM      = "kullanici_adiniz/feeds/nem";
const char* AIO_TOPIC_BASINC   = "kullanici_adiniz/feeds/basinc";
