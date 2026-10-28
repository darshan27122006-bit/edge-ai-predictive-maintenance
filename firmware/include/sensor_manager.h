/**
 * Sensor Manager Header.
 * Coordinates acquisition from MPU6050 Accelerometer (I2C)
 * and DS18B20 OneWire Temperature Sensor.
 */

#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <stdint.h>
#include <stdbool.h>

struct RawSensorData {
    float accel_x;       // Acceleration X (m/s^2)
    float accel_y;       // Acceleration Y (m/s^2)
    float accel_z;       // Acceleration Z (m/s^2)
    float vibration_mag; // Combined vibration magnitude (m/s^2)
    float temperature_c; // Temperature in Celsius
    bool mpu_valid;      // MPU6050 communication health flag
    bool temp_valid;     // DS18B20 communication health flag
};

class SensorManager {
public:
    SensorManager();
    bool begin();
    
    // Non-blocking sampling methods
    bool readAccelerometer(float &ax, float &ay, float &az, float &magnitude);
    bool readTemperature(float &temp_c);
    RawSensorData readAll();

    bool isMpuHealthy() const { return _mpu_healthy; }
    bool isTempHealthy() const { return _temp_healthy; }

private:
    bool _mpu_healthy;
    bool _temp_healthy;
    float _last_valid_temp;
    uint32_t _last_temp_read_ms;
};

extern SensorManager sensorManager;

#endif // SENSOR_MANAGER_H
