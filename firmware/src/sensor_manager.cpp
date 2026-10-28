/**
 * Sensor Manager Implementation.
 * Robust I2C communication with MPU6050 (registers 0x3B-0x40)
 * and OneWire DS18B20 temperature acquisition.
 */

#include "sensor_manager.h"
#include "config.h"
#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// OneWire bus instance
static OneWire oneWire(PIN_ONEWIRE_TEMP);
static DallasTemperature dallasSensors(&oneWire);

SensorManager sensorManager;

SensorManager::SensorManager()
    : _mpu_healthy(false),
      _temp_healthy(false),
      _last_valid_temp(40.0f),
      _last_temp_read_ms(0) {}

bool SensorManager::begin() {
    Serial.println("[Sensors] Initializing hardware interfaces...");

    // 1. Initialize I2C Bus for MPU6050 & OLED
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 400000); // 400 kHz fast I2C
    delay(50);

    // Test MPU6050 connection
    Wire.beginTransmission(MPU6050_I2C_ADDR);
    Wire.write(0x75); // WHO_AM_I register
    uint8_t error = Wire.endTransmission();

    if (error == 0) {
        Wire.requestFrom(MPU6050_I2C_ADDR, 1);
        if (Wire.available()) {
            uint8_t chip_id = Wire.read();
            if (chip_id == 0x68 || chip_id == 0x72 || chip_id == 0x70) {
                // Wake up MPU6050 (clear SLEEP bit in PWR_MGMT_1)
                Wire.beginTransmission(MPU6050_I2C_ADDR);
                Wire.write(0x6B); // PWR_MGMT_1
                Wire.write(0x00); // Internal 8MHz oscillator / wake up
                Wire.endTransmission();
                delay(20);

                // Configure Accelerometer Range (+/- 8g for machinery vibration)
                Wire.beginTransmission(MPU6050_I2C_ADDR);
                Wire.write(0x1C); // ACCEL_CONFIG
                Wire.write(0x10); // +/- 8g scale (4096 LSB/g)
                Wire.endTransmission();

                _mpu_healthy = true;
                Serial.printf("[Sensors] MPU6050 initialized successfully (Chip ID: 0x%02X, +/-8g range).\n", chip_id);
            } else {
                Serial.printf("[Sensors] WARNING: MPU6050 unexpected WHO_AM_I: 0x%02X\n", chip_id);
            }
        }
    } else {
        Serial.printf("[Sensors] ERROR: MPU6050 not detected on I2C bus (error code: %d).\n", error);
        _mpu_healthy = false;
    }

    // 2. Initialize Dallas OneWire Temperature Sensor
    dallasSensors.begin();
    dallasSensors.setWaitForConversion(false); // Non-blocking reads
    uint8_t deviceCount = dallasSensors.getDeviceCount();
    if (deviceCount > 0) {
        _temp_healthy = true;
        Serial.printf("[Sensors] DS18B20 detected on GPIO %d (Found %d sensor(s)).\n", PIN_ONEWIRE_TEMP, deviceCount);
        dallasSensors.requestTemperatures();
    } else {
        Serial.printf("[Sensors] WARNING: No DS18B20 detected on GPIO %d. Check 4.7k pull-up resistor.\n", PIN_ONEWIRE_TEMP);
        _temp_healthy = false;
    }

    return (_mpu_healthy || _temp_healthy);
}

bool SensorManager::readAccelerometer(float &ax, float &ay, float &az, float &magnitude) {
    if (!_mpu_healthy) {
        ax = ay = az = magnitude = 0.0f;
        return false;
    }

    Wire.beginTransmission(MPU6050_I2C_ADDR);
    Wire.write(0x3B); // ACCEL_XOUT_H
    if (Wire.endTransmission(false) != 0) {
        _mpu_healthy = false;
        return false;
    }

    if (Wire.requestFrom(MPU6050_I2C_ADDR, 6) == 6) {
        int16_t raw_x = (Wire.read() << 8) | Wire.read();
        int16_t raw_y = (Wire.read() << 8) | Wire.read();
        int16_t raw_z = (Wire.read() << 8) | Wire.read();

        // 4096.0 LSB/g for +/- 8g range
        const float lsb_per_g = 4096.0f;
        ax = (raw_x / lsb_per_g) * GRAVITY_MSS;
        ay = (raw_y / lsb_per_g) * GRAVITY_MSS;
        az = (raw_z / lsb_per_g) * GRAVITY_MSS;

        // Overall vibration vector magnitude in m/s^2
        magnitude = sqrtf(ax * ax + ay * ay + az * az);
        return true;
    }

    _mpu_healthy = false;
    return false;
}

bool SensorManager::readTemperature(float &temp_c) {
    uint32_t now = millis();
    // Read temperature at most every 750 ms (DS18B20 conversion time)
    if (now - _last_temp_read_ms >= 750) {
        _last_temp_read_ms = now;

        if (_temp_healthy) {
            float t = dallasSensors.getTempCByIndex(0);
            // DS18B20 returns -127.0 or 85.0 on communication error/disconnection
            if (t > -50.0f && t < 150.0f && t != 85.0f) {
                _last_valid_temp = t;
                temp_c = t;
                dallasSensors.requestTemperatures(); // Trigger next conversion
                return true;
            } else {
                Serial.printf("[Sensors] Invalid temperature reading: %.1f C\n", t);
                _temp_healthy = false;
            }
        } else {
            // Attempt auto-reconnect
            if (dallasSensors.getDeviceCount() > 0) {
                _temp_healthy = true;
                dallasSensors.requestTemperatures();
            }
        }
    }

    temp_c = _last_valid_temp;
    return _temp_healthy;
}

RawSensorData SensorManager::readAll() {
    RawSensorData data;
    data.mpu_valid = readAccelerometer(data.accel_x, data.accel_y, data.accel_z, data.vibration_mag);
    data.temp_valid = readTemperature(data.temperature_c);
    return data;
}
